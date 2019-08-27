import {
  inject,
  globalInterceptor,
  Interceptor,
  InvocationContext,
  InvocationResult,
  Provider,
  ValueOrPromise,
} from '@loopback/context';
import {RestBindings} from '@loopback/rest';
import { configure, getLogger } from 'log4js';
import {
  JWTBindings,
  UserProfile,
} from '../jwtbindings';

const config = require('../../log4js.json');

configure(config);

const loggerHttp = getLogger("http");
const loggerError = getLogger("error");

/**
 * This class will be bound to the application as an `Interceptor` during
 * `boot`
 */
@globalInterceptor('', {tags: {name: 'logging'}})
export class LoggingInterceptor implements Provider<Interceptor> {
  constructor(
    @inject(JWTBindings.CURRENT_USER) protected userProfile : UserProfile,
  ) {
    
  }
  
  /**
   * This method is used by LoopBack context to produce an interceptor function
   * for the binding.
   *
   * @returns An interceptor function
   */
  value() {
    return this.intercept.bind(this);
  }

  /**
   * The logic to intercept an invocation
   * @param invocationCtx - Invocation context
   * @param next - A function to invoke next interceptor or the target method
   */
  async intercept(
    invocationCtx: InvocationContext,
    next: () => ValueOrPromise<InvocationResult>,
  ) {
    try {
      const req = await invocationCtx.get(RestBindings.Http.REQUEST, {optional: true,});

      if (req) {
        loggerHttp.info(`${this.userProfile.username}: ${req.path}`);
      }

      const result = await next();
      
      return result;
    } catch (err) {
      loggerError.error(err);
      throw err;
    }
  }
}
