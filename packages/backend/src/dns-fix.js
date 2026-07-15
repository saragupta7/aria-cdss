// Some networks fail to resolve MongoDB Atlas SRV records with the system
// resolver; pin Node's DNS to public resolvers so the connection succeeds.
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
