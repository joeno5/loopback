const application = require('./dist');
const {config} = require('./config.js');

module.exports = application;

if (require.main === module) {
  // Run the application
  // const config = {
  //   rest: {
  //     port: +(process.env.PORT || 3000),
  //     host: process.env.HOST,
  //     openApiSpec: {
  //       // useful when used with OpenAPI-to-GraphQL to locate your application
  //       setServersFromRequest: true,
  //     },
  //   },
  // };
  console.log(config);
  application.main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
