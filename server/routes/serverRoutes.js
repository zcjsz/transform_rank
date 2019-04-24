export default function (server, client) {

  server.route({
    path: '/elasticsearch/search',
    method: 'POST',
    handler: (request, reply) => {
      client.search({
        index: request.payload.index,
        body: request.payload.body,
      })
      .then((response)=>{
        reply(response);
        return response;
      })
      .catch((error)=>{
        reply(error.response);
        return error.response;
      });
    }
  });

  server.route({
    path: '/elasticsearch/search_scroll',
    method: 'POST',
    handler: (request, reply) => {
      client.search({
        sort: ["_doc"],
        scroll: '1m',
        size: request.payload.body.size ? request.payload.body.size : 10000,
        index: request.payload.index,
        body: request.payload.body,
      })
      .then((response)=>{
        reply(response);
        return response;
      })
      .catch((error)=>{
        reply(error.response);
        return error.response;
      });
    }
  });

  server.route({
    path: '/elasticsearch/search_scroll_id',
    method: 'POST',
    handler: (request, reply)=>{
      client.scroll({
        scroll: '1m',
        scrollId: request.payload.scroll_id
      })
      .then((response)=>{
        reply(response);
        return response;
      })
      .catch((error)=>{
        reply(error.response);
        return error.response;
      });
    }
  });
}