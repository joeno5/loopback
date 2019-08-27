const fs = require('fs'); //import * as fs from 'fs';

exports.config = {
    rest: {
        protocol: 'https',
        key: fs.readFileSync('./key.pem'),
        cert: fs.readFileSync('./certificate.pem'),
        port: process.env.PORT || 3000,
        host: process.env.HOST,
        openApiSpec: {
            // useful when used with OpenAPI-to-GraphQL to locate your application
            setServersFromRequest: true,
        },
        cors: {
            origin: ['https://resttesttest.com', 'https://www.test-cors.org'],
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            preflightContinue: true,
            optionsSuccessStatus: 204,
            maxAge: 86400,
            credentials: true,
        },
        expressSettings: {
            'x-powered-by': false,
            env: process.env.NODE_ENV || 'development',
        },
        router: {
            strict: true
        },
    },
}
