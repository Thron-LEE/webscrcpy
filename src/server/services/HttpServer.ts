import * as http from 'http';
import * as https from 'https';
import path from 'path';
import { Service } from './Service';
import { Utils } from '../Utils';
import express, { Express } from 'express';
import { Config } from '../Config';
import { TypedEmitter } from '../../common/TypedEmitter';

// 定义默认的静态文件目录
const DEFAULT_STATIC_DIR = path.join(__dirname, './public');

// 定义 HttpServer 类型的接口
export type ServerAndPort = {
    server: https.Server | http.Server;
    port: number;
};

// 定义 HttpServer 类型的事件
interface HttpServerEvents {
    started: boolean;
}

// 定义 HttpServer 类
export class HttpServer extends TypedEmitter<HttpServerEvents> implements Service {
    private static instance: HttpServer;
    private static PUBLIC_DIR = DEFAULT_STATIC_DIR;
    private static SERVE_STATIC = true;
    private servers: ServerAndPort[] = [];
    private mainApp?: Express;
    private started = false;

    protected constructor() {
        super();
    }

    // 获取 HttpServer 实例
    public static getInstance(): HttpServer {
        if (!this.instance) {
            this.instance = new HttpServer();
        }
        return this.instance;
    }

    // 判断是否存在 HttpServer 实例
    public static hasInstance(): boolean {
        return !!this.instance;
    }

    // 设置静态文件目录
    public static setPublicDir(dir: string): void {
        if (HttpServer.instance) {
            throw Error('Unable to change value after instantiation');
        }
        HttpServer.PUBLIC_DIR = dir;
    }

    // 设置是否提供静态文件服务
    public static setServeStatic(enabled: boolean): void {
        if (HttpServer.instance) {
            throw Error('Unable to change value after instantiation');
        }
        HttpServer.SERVE_STATIC = enabled;
    }

    // 获取服务器列表
    public async getServers(): Promise<ServerAndPort[]> {
        if (this.started) {
            return [...this.servers];
        }
        return new Promise<ServerAndPort[]>((resolve) => {
            this.once('started', () => {
                resolve([...this.servers]);
            });
        });
    }

    // 获取服务名称
    public getName(): string {
        return `HTTP(s) Server Service`;
    }

    // 启动服务
    public async start(): Promise<void> {
        this.mainApp = express();
        if (HttpServer.SERVE_STATIC && HttpServer.PUBLIC_DIR) {
            // 添加静态文件服务
            this.mainApp.use(express.static(HttpServer.PUBLIC_DIR));

            /// #if USE_WDA_MJPEG_SERVER

            const { MjpegProxyFactory } = await import('../mw/MjpegProxyFactory');
            // 添加 Mjpeg 代理服务
            this.mainApp.get('/mjpeg/:udid', new MjpegProxyFactory().proxyRequest);
            /// #endif
        }
        const config = Config.getInstance();
        config.servers.forEach((serverItem) => {
            const { secure, port, redirectToSecure } = serverItem;
            let proto: string;
            let server: http.Server | https.Server;
            if (secure) {
                if (!serverItem.options) {
                    throw Error('Must provide option for secure server configuration');
                }
                // 创建 https 服务器
                server = https.createServer(serverItem.options, this.mainApp);
                proto = 'https';
            } else {
                const options = serverItem.options ? { ...serverItem.options } : {};
                proto = 'http';
                let currentApp = this.mainApp;
                let host = '';
                let port = 443;
                let doRedirect = false;
                if (redirectToSecure === true) {
                    doRedirect = true;
                } else if (typeof redirectToSecure === 'object') {
                    doRedirect = true;
                    if (typeof redirectToSecure.port === 'number') {
                        port = redirectToSecure.port;
                    }
                    if (typeof redirectToSecure.host === 'string') {
                        host = redirectToSecure.host;
                    }
                }
                if (doRedirect) {
                    currentApp = express();
                    // 添加 http 重定向服务
                    currentApp.use(function (req, res) {
                        const url = new URL(`https://${host ? host : req.headers.host}${req.url}`);
                        if (port && port !== 443) {
                            url.port = port.toString();
                        }
                        return res.redirect(301, url.toString());
                    });
                }
                // 创建 http 服务器
                server = http.createServer(options, currentApp);
            }
            this.servers.push({ server, port });
            // 监听端口
            server.listen(port, () => {
                Utils.printListeningMsg(proto, port);
            });
        });
        this.started = true;
        this.emit('started', true);

    }

    // 释放资源
    public release(): void {
        this.servers.forEach((item) => {
            item.server.close();
        });
    }
}
