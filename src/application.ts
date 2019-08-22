import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {
  JWTBindings,
  JWTConstants,
} from './jwtbindings';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import * as path from 'path';
import {JWTAuthenticationSequence} from './sequences/jwtsequence';

export class BackendApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    this.setUpBindings();
    
    // Set up the JWT Authentication in the sequence
    this.sequence(JWTAuthenticationSequence);

    
    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.bind(RestExplorerBindings.CONFIG).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  setUpBindings(): void {
    this.bind(JWTBindings.JWKS_URL).to(
      JWTConstants.JWKS_URL_VALUE,
    );

    this.bind(JWTBindings.JWT_AUDIENCE).to(
      JWTConstants.JWT_AUDIENCE_VALUE,
    );
    
    this.bind(JWTBindings.JWT_ISSUER).to(
      JWTConstants.JWT_ISSUER_VALUE,
    );

    this.bind(JWTBindings.JWT_IGNORE_EXPIRATION).to(
      JWTConstants.JWT_IGNORE_EXPIRATION_VALUE
    )

    this.bind(JWTBindings.JWT_VALIDATION_EXCLUDE_PATHS).to(
      JWTConstants.JWT_VALIDATION_EXCLUDE_PATHS_VALUE
    );
  }  
}
