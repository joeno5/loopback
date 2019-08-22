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

const getJWTToken = R.pipe(
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

const startWith = R.curry((a: string, b: string) => {
  return a.startsWith(b);
});

const notInExcludePath = R.curry((path: string, excludePaths: string) => R.pipe(
    R.split(';'),
    R.any(startWith(path)),
    R.not
)(excludePaths));

export class JWTAuthenticationSequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) protected send: Send,
    @inject(SequenceActions.REJECT) protected reject: Reject,
    @inject(JWTBindings.JWT_VALIDATION_EXCLUDE_PATHS) private jwtExcludePaths: string,
    @inject(JWTBindings.JWKS_URL) private jwksUrl: string,
    @inject(JWTBindings.JWT_AUDIENCE) private audience: string,
    @inject(JWTBindings.JWT_ISSUER) private issuer: string,
    @inject(JWTBindings.JWT_IGNORE_EXPIRATION) private ignoreExpiration: boolean,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      const route = this.findRoute(request);
      
      if (notInExcludePath(request.path, this.jwtExcludePaths)) {
        var token = getJWTToken(request);

        if (!token) {
          throw new HttpErrors.Unauthorized(
            'No JWT token provided.',
          );
        }

        // retrieve algorithm and key ID from token
        var {alg, x5t} = getJWTHeader(token);
        
        // get Signing Key from JWKS server
        const jwks = jwksClient({
          jwksUri: this.jwksUrl,
          cache: true,
        });
        
        const getSigningKeyAsync = promisify(jwks.getSigningKey);
        var signingKey = await getSigningKeyAsync(x5t);
        
        // verify JWT Token (check audience, issuer, and exp)
        // ignore expiration checking if ignoreExpiration is ture
        const verifyAsync = promisify(jwt.verify);
        const decoded = await verifyAsync(
          token,
          signingKey.publicKey,
          {
            algorithms: [alg],
            audience: this.audience,
            issuer: this.issuer,
            ignoreExpiration: this.ignoreExpiration,
          }
        )

        console.log(decoded);
      }
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
