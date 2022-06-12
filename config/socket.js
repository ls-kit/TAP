const http = require('http');
const socketIO = require('socket.io');
var app = express();
const server = http.Server(app);
var port = 5000;

server.listen(port + (process.env.NODE_APP_INSTANCE ? parseInt(process.env.NODE_APP_INSTANCE) : 0), () => {
  
    console.log('Magic happens on port ' + port);

    const io = socketIO(server);
    var redis = require('socket.io-redis');

    var Providers = require('../app/controllers/providers');
    var Trips = require('../app/controllers/trip');
    io.adapter(redis({ host: 'localhost', port: 6379 }));
    socket_object = io;

    io.on('connection', socket => {

        console.log('connect socket')

        socket.on('trip_detail_notify', function (data, ackFn) {
          var trip_id ="'"+data.trip_id+"'";
          io.emit(trip_id, {is_trip_updated: true, trip_id: trip_id});
        });

        socket.on('update_location', function (data, ackFn) {
          var trip_id ="'"+data.trip_id+"'";
          var provider_id ="'"+data.provider_id+"'";
          Providers.update_location_socket({body: data}, function(response){
            ackFn(response);
            if(data.trip_id && response.success){
              io.emit(trip_id , {is_trip_updated: false, trip_id: trip_id, "bearing": data.bearing, "location": response.providerLocation, "total_time": response.total_time, "total_distance": response.total_distance});
            } else {
              io.emit(provider_id , {"bearing": data.bearing, "location": response.providerLocation, provider_id: data.provider_id});
            }
          });
        });

    });
});