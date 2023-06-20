export interface ControlMessageInterface {
    type: number;
}

export class ControlMessage {
    // 定义控制消息类型
    public static TYPE_KEYCODE = 0; // 按键事件
    public static TYPE_TEXT = 1; // 文本输入事件
    public static TYPE_TOUCH = 2; // 触摸事件
    public static TYPE_SCROLL = 3; // 滚动事件
    public static TYPE_BACK_OR_SCREEN_ON = 4; // 返回键或屏幕唤醒事件
    public static TYPE_EXPAND_NOTIFICATION_PANEL = 5; // 展开通知栏事件
    public static TYPE_EXPAND_SETTINGS_PANEL = 6; // 展开设置面板事件
    public static TYPE_COLLAPSE_PANELS = 7; // 收起所有面板事件
    public static TYPE_GET_CLIPBOARD = 8; // 获取剪贴板内容事件
    public static TYPE_SET_CLIPBOARD = 9; // 设置剪贴板内容事件
    public static TYPE_SET_SCREEN_POWER_MODE = 10; // 设置屏幕电源模式事件
    public static TYPE_ROTATE_DEVICE = 11; // 旋转设备事件
    public static TYPE_CHANGE_STREAM_PARAMETERS = 101; // 更改流参数事件
    public static TYPE_PUSH_FILE = 102; // 推送文件事件

    constructor(readonly type: number) {}

    public toBuffer(): Buffer {
        throw Error('未实现');
    }

    public toString(): string {
        return '控制消息';
    }

    public toJSON(): ControlMessageInterface {
        return {
            type: this.type,
        };
    }
}
