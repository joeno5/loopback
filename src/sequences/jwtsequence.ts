// Copyright IBM Corp. 2018,2019. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {inject} from '@loopback/context';
import {
  FindRoute,
  InvokeMethod,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
  HttpErrors
} from '@loopback/rest';
import {JWTBindings} from '../jwtbindings';
import {promisify} from 'util';

const SequenceActions = RestBindings.SequenceActions;
const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const R = require('ramda');

const isNotNil = R.complement(R.isNil);
const authorizationHeader = R.lensPath(['headers','authorization']);

const getBearer = R.pipe(
    R.split(' '),
    R.ifElse(
        R.pipe(R.head, R.equals('Bearer')),
        R.last,
        R.always(undefined)
    ),
)

const getToken = R.pipe(
    R.view(authorizationHeader),
    R.when(
        isNotNil, 
        getBearer
    ),
)

const getJWTHeader = R.pipe(
  R.split('.'),
  R.head,
  (a: string) => Buffer.from(a, 'base64').toString(),
  (a: string) => JSON.parse(a),
)

export class JWTAuthenticationSequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) protected send: Send,
    @inject(SequenceActions.REJECT) protected reject: Reject,
    @inject(JWTBindings.JWT_VALIDATION_EXCLUDE_PATH) private jwtExcludePath: string,
    @inject(JWTBindings.JWKS_URL) private jwksUrl: string,
    @inject(JWTBindings.JWT_AUDIENCE) private audience: string,
    @inject(JWTBindings.JWT_ISSUER) private issuer: string,
    @inject(JWTBindings.JWT_IGNORE_EXPIRATION) private ignoreExpiration: boolean,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      const route = this.findRoute(request);

      // todo skip auth check by jwtExcludePath
      console.log(this.jwtExcludePath);
      // console.log(request.path);
      
      var token = getToken(request);

      if (!token) {
        throw new HttpErrors.Unauthorized(
          'Invalid Authorization Header',
        );
      }

      var {alg, x5t} = getJWTHeader(token);
      
      const jwks = jwksClient({
        jwksUri: this.jwksUrl,
        cache: true,
      });
      
      const getSigningKeyAsync = promisify(jwks.getSigningKey);
      const verifyAsync = promisify(jwt.verify);

      var key = await getSigningKeyAsync(x5t);
      
      // verify JWT Token (check audience, issuer, and exp)
      // ignore expiration checking if ignoreExpiration is ture
      const decoded = await verifyAsync(
        token,
        key.publicKey,
        {
          algorithms: [alg],
          audience: this.audience,
          issuer: this.issuer,
          ignoreExpiration: this.ignoreExpiration,
        }
      )

      console.log(decoded);

      // Authentication successful, proceed to invoke controller
      const args = await this.parseParams(request, route);
      const result = await this.invoke(route, args);
      this.send(response, result);
    } catch (error) {
      Object.assign(error, {statusCode: 401 /* Unauthorized */});
      
      this.reject(context, error);
      return;
    }
  }
}
