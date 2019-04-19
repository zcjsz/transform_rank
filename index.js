import serverRoute from './server/routes/serverRoutes';

export default function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'transform_rank',
    uiExports: {
      visTypes: [
        'plugins/transform_rank/transform_rank'
      ],
      injectDefaultVars(server, options) {
        return {
          transformVisOptions: options
        };
      }
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        allow_unsafe: Joi.boolean().default(true),
      }).default();
    },

    init(server, options) {
      // Add server routes and initialize the plugin here
      // const config = server.config()
      const client = server.plugins.elasticsearch.getCluster('admin').getClient();
      serverRoute(server, client);
    }

  });
}
