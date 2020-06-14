import * as Koa from 'koa';
import * as bodyParser from 'koa-bodyparser';
import * as Router from '@koa/router';
import { asyncHook, createCtx, getCtx } from './ctx-map';
import createDbConnection from './db-connection';

asyncHook.enable();

const app = new Koa();
const router = new Router();

router.post('/order', async (ctx, next) => {
    const userId = ctx.request.header['user-id'];
    const products = ctx.request.body;

    const orderService = new OrderService();
    await orderService.placeOrder(userId, products);

    ctx.status = 201;
    ctx.body = {};
    await next();
});

class OrderService {
    constructor(
        private orderRepository = new OrderRepository(),
        private notificationRepository = new NotificationRepository(),
        private userRepository = new UserRepository(),
    ) {}

    async placeOrder(userId, products) {

        await getCtx().dbConn.query('START TRANSACTION');
        try {
            const [user] = await this.userRepository.findById(userId);
            await this.orderRepository.save(userId, products);

            throw new Error('unexpected error');

            await this.notificationRepository.save('email', user.email);
            await getCtx().dbConn.query('COMMIT');
        } catch (err) {
            console.log('err', err);
            await getCtx().dbConn.query('ROLLBACK');
        }
       
    }
}

class UserRepository {
    async findById(id) {
        return getCtx().dbConn.query(
            'SELECT * FROM `user` WHERE `userId` = ?',
            [id],
        )
    }
}

class OrderRepository {
    async save(userId, products) {
        const productIds = products.map(product => product.productId).toString();
        const qtys = products.map(product => product.qty).toString();

        return getCtx().dbConn.query(
            'INSERT INTO `order` (`userId`, `productIds`, `qtys`, `orderedAt`) VALUES(?, ?, ?, ?)', 
            [userId, productIds, qtys, new Date()],
        )
    }
}

class NotificationRepository {
    async save(method, destination) {
        return getCtx().dbConn.query(
            'INSERT INTO `notification` (`method`, `destination`) VALUES(?, ?)',
            [method, destination],
        )
    }
}

app.use(bodyParser());
app.use(async (ctx, next) => {
    // context를 생성
    createCtx(ctx);    
    await next();
});
app.use(async (ctx, next) => {
    // db connection을 context에 주입
    const dbConn = createDbConnection();
    const currentCtx = getCtx();
    currentCtx.dbConn = dbConn;
    await next();
});
app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx, next) => {
    // db connection을 종료
    const currnetCtx = getCtx();
    await currnetCtx.dbConn.close();
    await next();
});

app.listen(3001);
