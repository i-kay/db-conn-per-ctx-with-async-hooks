import * as mysql from 'mysql';
import * as util from 'util';

function createDbConnection() {
  const connection = mysql.createConnection( {
    // debug: ['ComQueryPacket', 'RowDataPacket'],
    host     : 'localhost',
    user     : 'root',
    password : '1234',
    database : 'async_hook',
  } );
  return {
    query(sql, args?) {
      return util.promisify(connection.query).call(connection, sql, args);
    },
    close() {
      return util.promisify(connection.end).call(connection);
    },
  };
}

export default createDbConnection;
 