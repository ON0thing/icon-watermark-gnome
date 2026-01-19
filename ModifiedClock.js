import St from 'gi://St';
import GObject from 'gi://GObject';
import GnomeDesktop from 'gi://GnomeDesktop';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';

import {formatDateWithCFormatString} from 'resource:///org/gnome/shell/misc/dateUtils.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';

import execCommunicate from './utils/getCommandOutput.js';

const HINT_TIMEOUT = 4;
const CROSSFADE_TIME = 300;
const SHELL_VERSION = parseInt(Config.PACKAGE_VERSION.split(' ')[0]);

const ModifiedClock = GObject.registerClass(
    class ModifiedClock extends St.BoxLayout {
        _init(settings, width) {
            let initObj = {
                style_class: 'unlock-dialog-clock',
                y_align: Clutter.ActorAlign.CENTER,
            };

            if (SHELL_VERSION >= 48)
                initObj.orientation = Clutter.Orientation.VERTICAL;
            else
                initObj.vertical = true;

            super._init(initObj);

            this._settings = settings;
            this._isDestroyed = false;

            // 确保width是有效数字
            if (isNaN(width) || width <= 0) {
                width = 400; // 默认宽度
            }

            this._customTimeText = this._settings.get_string('custom-time-text');
            this._customDateText = this._settings.get_string('custom-date-text');

            const DEFAULT = 'Default';

            // command output as text
            this._commandOutput = new St.Label({
                style_class: 'unlock-dialog-clock-date',
                x_align: Clutter.ActorAlign.CENTER,
            });

            this._applyStyleToLabel(this._commandOutput, 'command-output', width, true);

            // time text
            this._time = new St.Label({
                style_class: 'unlock-dialog-clock-time',
                x_align: Clutter.ActorAlign.CENTER,
            });

            this._applyStyleToLabel(this._time, 'time', width, false);

            // date text
            this._date = new St.Label({
                style_class: 'unlock-dialog-clock-date',
                x_align: Clutter.ActorAlign.CENTER,
            });

            this._applyStyleToLabel(this._date, 'date', width, false);

            // hint text
            this._hint = new St.Label({
                style_class: 'unlock-dialog-clock-hint',
                x_align: Clutter.ActorAlign.CENTER,
                opacity: 0,
            });

            this._applyStyleToLabel(this._hint, 'hint', width, false);

            const removeCustomCommand = this._settings.get_boolean('remove-command-output');
            const command = this._settings.get_string('command');
            const removeTime = this._settings.get_boolean('remove-time');
            const removeDate = this._settings.get_boolean('remove-date');
            const removeHint = this._settings.get_boolean('remove-hint');

            // 在 _init 方法中修改命令输出的容器结构
            // 在 _init 方法中修改
            if (!removeCustomCommand && command) {
                // 创建垂直容器
                this._commandContainer = new St.BoxLayout({
                    vertical: true,
                    x_align: Clutter.ActorAlign.CENTER
                });
                
                // 创建图片容器（关键修改：必须设置具体尺寸）
                this._commandImage = new St.Bin({
                    x_align: Clutter.ActorAlign.CENTER,
                    width: 100,
                    height: 100, // 必须设置明确高度
                    style_class: 'command-image'
                });
                
                this._commandContainer.add_child(this._commandImage);
                this._commandContainer.add_child(this._commandOutput);
                this.add_child(this._commandContainer);
                
                this._createCommandText();
                
                // 立即设置图片（而不是在 _applyStyleToLabel 中）
                this._setCommandImage();
            }

            if (!removeTime)
                this.add_child(this._time);

            if (!removeDate)
                this.add_child(this._date);

            if (!removeHint)
                this.add_child(this._hint);

            this._wallClock = new GnomeDesktop.WallClock({time_only: true});
            this._wallClock.connect('notify::clock', this._updateClock.bind(this));

            if (SHELL_VERSION >= 48) {
                const backend = this.get_context().get_backend();
                this._seat = backend.get_default_seat();
            } else {
                this._seat = Clutter.get_default_backend().get_default_seat();
            }

            this._seat.connectObject('notify::touch-mode',
                this._updateHint.bind(this), this);

            this._monitorManager = global.backend.get_monitor_manager();
            this._monitorManager.connectObject('power-save-mode-changed',
                () => {
                    if (!this._isDestroyed && this._hint) {
                        this._hint.opacity = 0;
                    }
                }, this);

            this._idleMonitor = global.backend.get_core_idle_monitor();
            this._idleWatchId = this._idleMonitor.add_idle_watch(HINT_TIMEOUT * 1000, () => {
                if (!this._isDestroyed && this._hint) {
                    this._hint.ease({
                        opacity: 255,
                        duration: CROSSFADE_TIME,
                    });
                }
            });

            this._updateClock();
            this._updateHint();
        }
        // 新增方法专门处理图片
        _setCommandImage() {
            const bgImagePath = '/home/uman/Pictures/hw.png';
            if (!bgImagePath || !this._commandImage) return;
            
            try {
                let file = Gio.File.new_for_path(bgImagePath);
                if (file.query_exists(null)) {
                    const imageUri = file.get_uri();
                    console.log('Image URI:', imageUri);
                    
                    // 关键修改：使用绝对URI并确保样式正确
                    const css = `
                        background-image: url('${imageUri}');
                        background-size: contain;
                        background-repeat: no-repeat;
                        background-position: center;
                    `;
                    
                    this._commandImage.set_style(css);
                } else {
                    console.warn('Image file not found:', bgImagePath);
                }
            } catch (e) {
                console.error('Image load error:', e);
            }
        }

        // 修改 _applyStyleToLabel 方法
        _applyStyleToLabel(label, type, width, isCommandOutput = false) {
            const DEFAULT = 'Default';
            
            let color = this._settings.get_string(`${type}-font-color`);
            let size = this._settings.get_int(`${type}-font-size`);
            let family = this._settings.get_string(`${type}-font-family`);
            let weight = this._settings.get_string(`${type}-font-weight`);
            let style = this._settings.get_string(`${type}-font-style`);

            let css = '';
            
            // 处理颜色
            if (color && color !== DEFAULT) {
                if (isCommandOutput) {
                    //css += 'color: transparent;\n';
                    css += `color: ${color};\n`;
                } else {
                    css += `color: ${color};\n`;
                }
            }

            // 处理字体大小 - 确保是有效数字
            if (size && !isNaN(size) && size > 0) {
                css += `font-size: ${size}px;\n`;
            }

            // 处理字体族
            if (family && family !== DEFAULT) {
                css += `font-family: "${family}", sans-serif;\n`;
            }

            // 处理字体粗细
            if (weight && weight !== DEFAULT) {
                css += `font-weight: ${weight};\n`;
            }

            // 处理字体样式
            if (style && style !== DEFAULT) {
                css += `font-style: ${style};\n`;
            }

            css += 'text-align: center;\n';

            // 处理最大宽度 - 确保是有效数字
            if (width && !isNaN(width) && width > 0) {
                css += `max-width: ${width}px;\n`;
            }

            // 为命令输出添加背景图片

            if (css.trim() !== '') {
                label.set_style(css);
            }
            
            if (label.clutter_text) {
                label.clutter_text.set_line_wrap(true);
            }
        }

        async _createCommandText() {
            try {
                const command = this._settings.get_string('command');
                if (!command) {
                    if (!this._isDestroyed && this._commandOutput) {
                        this._commandOutput.text = '';
                    }
                    return;
                }

                const commandParts = command.split(' ').filter(part => part.trim() !== '');
                const text = await execCommunicate(commandParts);
                
                if (!this._isDestroyed && this._commandOutput) {
                    this._commandOutput.text = text || '';
                }
            } catch (e) {
                console.error('Command execution error:', e);
                if (!this._isDestroyed && this._commandOutput) {
                    this._commandOutput.text = 'Command Error';
                }
            }
        }

        _updateClock() {
            if (this._isDestroyed) return;
            
            let date = new Date();

            // 更新时间
            if (this._time && !this._isDestroyed) {
                if (this._customTimeText?.startsWith('%')) {
                    let customTimeFormat = Shell.util_translate_time_string(this._customTimeText);
                    this._time.text = formatDateWithCFormatString(date, customTimeFormat);
                } else if (this._customTimeText) {
                    this._time.text = this._customTimeText;
                } else {
                    this._time.text = this._wallClock.clock ? this._wallClock.clock.trim() : '';
                }
            }

            // 更新日期
            if (this._date && !this._isDestroyed) {
                if (this._customDateText?.startsWith('%')) {
                    let customDateFormat = Shell.util_translate_time_string(this._customDateText);
                    this._date.text = formatDateWithCFormatString(date, customDateFormat);
                } else if (this._customDateText) {
                    this._date.text = this._customDateText;
                } else {
                    let dateFormat = Shell.util_translate_time_string('%A %B %-d');
                    this._date.text = formatDateWithCFormatString(date, dateFormat);
                }
            }
        }

        _updateHint() {
            if (this._isDestroyed || !this._hint || !this._seat) return;
            
            this._hint.text = this._seat.touch_mode
                ? 'Swipe up to unlock'
                : 'Click or press a key to unlock';
        }

        destroy() {
            this._isDestroyed = true;
            
            // 断开所有信号连接
            if (this._wallClock) {
                this._wallClock.disconnectObject(this);
                this._wallClock = null;
            }
            
            if (this._seat) {
                this._seat.disconnectObject(this);
                this._seat = null;
            }
            
            if (this._monitorManager) {
                this._monitorManager.disconnectObject(this);
                this._monitorManager = null;
            }
            
            // 移除空闲监视器
            if (this._idleMonitor && this._idleWatchId) {
                this._idleMonitor.remove_watch(this._idleWatchId);
                this._idleWatchId = null;
            }
            
            // 清理标签引用
            this._time = null;
            this._date = null;
            this._hint = null;
            this._commandOutput = null;
            
            super.destroy();
        }
    }
);

export default ModifiedClock;