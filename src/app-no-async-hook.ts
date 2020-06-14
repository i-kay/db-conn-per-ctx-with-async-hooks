import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as Router from '@koa/router';
import createDbConnection from './db-connection';

const app = new Koa();
const router = new Router();

router.post('/order', async (ctx, next) => {
    const userId = ctx.request.header['user-id'];
    const products = ctx.request.body;

    const orderService = new OrderService();
    await orderService.placeOrder(userId, products);

    ctx.status = 201;
    ctx.body = {};
});

class OrderService {
    constructor(
        private orderRepository = new OrderRepository(),
        private notificationRepository = new NotificationRepository(),
        private userRepository = new UserRepository(),
    ) {}

    async placeOrder(userId, products) {

        const dbConn = createDbConnection();

        await dbConn.query('START TRANSACTION');
        try {
            const [user] = await this.userRepository.findById(dbConn, userId);
            await this.orderRepository.save(dbConn, userId, products);

            throw new Error('unexpected error');

            await this.notificationRepository.save(dbConn, 'email', user.email);
            await dbConn.query('COMMIT');
        } catch (err) {
            console.log('err', err);
            await dbConn.query('ROLLBACK');
        }
       
    }
}

class UserRepository {
    async findById(dbConn, id) {
        return dbConn.query(
            'SELECT * FROM `user` WHERE `userId` = ?',
            [id],
        )
    }
}

class OrderRepository {
    async save(dbConn, userId, products) {
        const productIds = products.map(product => product.productId).toString();
        const qtys = products.map(product => product.qty).toString();

        return dbConn.query(
            'INSERT INTO `order` (`userId`, `productIds`, `qtys`, `orderedAt`) VALUES(?, ?, ?, ?)', 
            [userId, productIds, qtys, new Date()],
        )
    }
}

class NotificationRepository {
    async save(dbConn, method, destination) {
        return dbConn.query(
            'INSERT INTO `notification` (`method`, `destination`) VALUES(?, ?)',
            [method, destination],
        )
    }
}

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);
