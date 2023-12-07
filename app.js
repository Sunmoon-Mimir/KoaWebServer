const Koa = require('koa')//导入了koa
const app = new Koa()//创建了服务端实例对象
const path = require('path');
const views = require('koa-views')//导入了处理动态资源包
const json = require('koa-json')//导入了输出json格式的包
const onerror = require('koa-onerror')//导入了错误错误的包
const bodyparser = require('koa-bodyparser')//导入了处理post请求参数的包
const logger = require('koa-logger')//导入了记录日志的包
/*由于koa-logger并不支持把日志写入文件
* 所以我们就使用koa-morgan*/
const fs = require('fs')
const morgan = require('koa-morgan')
require('./db/sync');//建表
const session = require('koa-generic-session');
const redisStore = require('koa-redis');
const {REDIS_CONFIG, MYSQL_CONFIG} = require('./config/db');
const logFilePath = path.join(__dirname, 'log/access.log');
const accessLogStream = fs.createWriteStream(logFilePath, {flags: 'a'});
app.use(morgan('combined', {
    stream: accessLogStream
}))

/*koa中如何保存登录状态？
借助: koa-generic-session 和koa-redis
* */
app.keys = ['xmy666'];//userid
const store = redisStore({
    host:REDIS_CONFIG.host,
    port:REDIS_CONFIG.port
});
app.use(session({
    store,
    cookie: {
        path: '/',
        maxAge: 60 * 60 * 1000 * 24, // 1 day
        httpOnly: true,
    },
}));

console.log('MYSQL_CONFIG:',MYSQL_CONFIG);

//导入了封装好的路由
const users = require('./routes/users')
const user = require('./routes/user')

// error handler
onerror(app)//告诉系统需要捕获哪一个程序的错误

// middlewares 注册了解析post请求参数的中间件
app.use(bodyparser({
    enableTypes: ['json', 'form', 'text']
}))
app.use(json())
app.use(logger())//注册了记录日志的中间件
//注册了处理静态资源的中间件
app.use(require('koa-static')(__dirname + '/public'))
//注册了处理动态资源的中间件
app.use(views(__dirname + '/views', {
    extension: 'pug'
}))

// logger 记录日志
app.use(async (ctx, next) => {
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// routes 注册启用了路由
app.use(users.routes(), users.allowedMethods());
app.use(user.routes(), user.allowedMethods());

// error-handling 处理错误
app.on('error', (err, ctx) => {
    console.error('server error', err, ctx)
});

module.exports = app
