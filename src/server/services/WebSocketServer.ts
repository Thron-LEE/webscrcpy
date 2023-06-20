import { Server as WSServer } from 'ws';
import WS from 'ws';
import { Service } from './Service';
import { HttpServer, ServerAndPort } from './HttpServer';
import { MwFactory } from '../mw/Mw';

export class WebSocketServer implements Service {
    private static instance?: WebSocketServer;
    private servers: WSServer[] = [];
    private mwFactories: Set<MwFactory> = new Set();

    protected constructor() {
        // nothing here
    }

    public static getInstance(): WebSocketServer {
        if (!this.instance) {
            this.instance = new WebSocketServer();
        }
        return this.instance;
    }

    public static hasInstance(): boolean {
        return !!this.instance;
    }

    /**
     * 注册中间件
     * @param mwFactory 中间件工厂
     */
    public registerMw(mwFactory: MwFactory): void {
        this.mwFactories.add(mwFactory);
    }

    /**
     * 将 WebSocket 服务器附加到 HTTP 服务器
     * @param item HTTP 服务器和端口
     * @returns WebSocket 服务器
     */
    public attachToServer(item: ServerAndPort): WSServer {
        const { server, port } = item;
        const TAG = `WebSocket Server {tcp:${port}}`;
        const wss = new WSServer({ server });
        wss.on('connection', async (ws: WS, request) => {
            if (!request.url) {
                ws.close(4001, `[${TAG}] Invalid url`);
                return;
            }
            const url = new URL(request.url, 'https://example.org/');
            const action = url.searchParams.get('action') || '';
            let processed = false;
            for (const mwFactory of this.mwFactories.values()) {
                const service = mwFactory.processRequest(ws, { action, request, url });
                if (service) {
                    processed = true;
                }
            }
            if (!processed) {
                ws.close(4002, `[${TAG}] Unsupported request`);
            }
            return;
        });
        wss.on('close', () => {
            console.log(`${TAG} stopped`);
        });
        this.servers.push(wss);
        return wss;
    }

    /**
     * 获取 WebSocket 服务器列表
     * @returns WebSocket 服务器列表
     */
    public getServers(): WSServer[] {
        return this.servers;
    }

    /**
     * 获取服务名称
     * @returns 服务名称
     */
    public getName(): string {
        return `WebSocket Server Service`;
    }

    /**
     * 启动 WebSocket 服务器
     */
    public async start(): Promise<void> {
        const service = HttpServer.getInstance();
        const servers = await service.getServers();
        servers.forEach((item) => {
            this.attachToServer(item);
        });
    }

    /**
     * 释放 WebSocket 服务器
     */
    public release(): void {
        this.servers.forEach((server) => {
            server.close();
        });
    }
}
