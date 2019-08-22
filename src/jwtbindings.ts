import {BindingKey} from '@loopback/context';

export namespace JWTConstants {
  export const JWKS_URL_VALUE = 'https://adfs-uat.polyu.edu.hk/adfs/discovery/keys';
  export const JWT_AUDIENCE_VALUE = 'urn:uuid:cafccaa2-0996-4ba4-b241-1a2c195c6d71';
  export const JWT_ISSUER_VALUE = 'http://adfs-uat.polyu.edu.hk/adfs/services/trust';
  export const JWT_IGNORE_EXPIRATION_VALUE = true;
  export const JWT_VALIDATION_EXCLUDE_PATHS_VALUE = '/ping;/login/;/public/';
}

export namespace JWTBindings {
  export const JWKS_URL = BindingKey.create<string>(
    'jwt.jwks.url',
  );

  export const JWT_AUDIENCE = BindingKey.create<string>(
    'jwt.audience',
  )
  
  export const JWT_ISSUER = BindingKey.create<string>(
    'jwt.issuer',
  )

  export const JWT_IGNORE_EXPIRATION = BindingKey.create<boolean>(
    'jwt.ignore.expiration'
  )

  export const JWT_VALIDATION_EXCLUDE_PATHS = BindingKey.create<string>(
    'jwt.validation.exclude.path',
  );
}
