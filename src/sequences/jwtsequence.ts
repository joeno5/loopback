import {
  inject,
  Setter,
} from '@loopback/context';
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
import {
  JWTBindings,
  UserProfile,
} from '../jwtbindings';
import {promisify} from 'util';

const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const R = require('ramda');

const SequenceActions = RestBindings.SequenceActions;
const verifyJWTAsync = promisify(jwt.verify);

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

const notInExcludePaths = R.curry((path: string, excludePaths: string) => R.pipe(
    R.split(';'),
    R.any(startWith(path)),
    R.not
)(excludePaths));

var signingKey: any = null;

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
    @inject.setter(JWTBindings.CURRENT_USER) readonly setCurrentUser: Setter<UserProfile>,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      
      if (notInExcludePaths(request.path, this.jwtExcludePaths)) {
        const token = getJWTToken(request);

        if (!token) {
          throw new HttpErrors.Unauthorized(
            'No JWT token provided.',
          );
        }

        // retrieve algorithm and key ID from JWT token
        const {alg, x5t} = getJWTHeader(token);
        
        // get Signing Key from JWKS server
        if (R.isNil(signingKey)) {
          const jwks = jwksClient({jwksUri: this.jwksUrl});
          const getSigningKeyAsync = promisify(jwks.getSigningKey);
          const {publicKey} = await getSigningKeyAsync(x5t);
          signingKey = publicKey;
        }
        
        // verify JWT Token (check against audience, issuer, and expiration time)
        // ignore expiration time checking if ignoreExpiration is ture
        const decodedToken = await verifyJWTAsync(
          token,
          signingKey,
          {
            algorithms: [alg],
            audience: this.audience,
            issuer: this.issuer,
            ignoreExpiration: this.ignoreExpiration,
          }
        )

        console.log(decodedToken);
        
        let userProfile = Object.assign(
          {username: '', email: ''},
          {username: decodedToken.cn, email: decodedToken.upn}
        );
        
        // set user profile set context
        this.setCurrentUser(userProfile);
      }

      // Authentication successful, proceed to invoke controller
      const route = this.findRoute(request);
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
