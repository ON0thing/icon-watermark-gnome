/* extension.js - 修正版本（GNOME 48 专用）- 修复锁屏模式循环问题 */
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ActivateGnomeExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this.labels = [];
        this.settings = null;
        this.handlers = [];
        this.panelButton = null;
        this.imageActor = null;
        this._addImageId = 0;
        this._currentImagePath = null;
        this._sessionId = null;

        // 保存原始状态
        this.originalDateTimePosition = null;
        this.originalExtensionPosition = null;
        this.dateTimeMenu = null;
        this.centerBox = null;

        // 面板操作相关
        this._panelUpdateTimeoutId = 0;
        this._isPanelReady = false;

        // 新增：锁屏模式状态管理
        this._isUnlockDialogMode = false;
        this._updateBlocked = false;
    }

    _onSessionModeChanged(session) {
        const oldMode = this._isUnlockDialogMode;
        this._isUnlockDialogMode = (session.currentMode === 'unlock-dialog');

        console.log(`Mode Change To: ${session.currentMode}, previous unlock mode: ${oldMode}`);

        if (this._isUnlockDialogMode) {
            // 进入锁屏模式
            this._updateBlocked = true; // 阻塞更新

            // 保持扩展按钮显示，但禁用交互
            if (this.panelButton) {
                this.panelButton.reactive = false;
                this.panelButton.can_focus = false;
            }

            // 清理水印文本和图片, Keep it stay here.
            //this.cleanupLabels();
            //this.cleanupImage();

            // 恢复日期时间位置（如果之前移动过）
            if (this.settings && this.settings.get_boolean('datetime-moved')) {
                this.restoreDateTime();
            }

        } else if (oldMode && !this._isUnlockDialogMode) {
            // 从锁屏模式返回用户模式 - 只恢复必要功能
            this._updateBlocked = false; // 解除阻塞

            // 恢复扩展按钮交互
            if (this.panelButton) {
                this.panelButton.reactive = true;
                this.panelButton.can_focus = true;
            }

            // 只恢复时钟位置，不刷新整个UI
            if (this.settings && this.settings.get_boolean('datetime-moved')) {
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                    if (!this._isUnlockDialogMode) {
                        this.moveDateTimeToLeft();
                    }
                    return GLib.SOURCE_REMOVE;
                });
            }

            console.log('Restored from unlock dialog: button functionality and clock position only');
        }
    }

    update() {
        // 检查是否在锁屏模式下，如果是则跳过更新
        if (this._updateBlocked || this._isUnlockDialogMode) {
            console.log('Update blocked: in unlock dialog mode');
            return;
        }

        // 先更新文本（不清理图片）
        this.cleanupLabels();

        // 获取设置
        let text1 = this.settings.get_string('text-l1') || 'Activate GNOME';
        let text2 = this.settings.get_string('text-l2') || 'Go to Settings to activate GNOME.';
        let vl2 = this.settings.get_double('l2-vertical');
        let hl2 = this.settings.get_double('l2-horizontal');
        let size1 = this.settings.get_double('size-l1');
        let size2 = this.settings.get_double('size-l2');
        let opacity = this.settings.get_double('opacity');
        let imagePath = this.settings.get_string('selected-image');
        let imageOpacity = this.settings.get_double('image-opacity') / 255.0;
        let imagePositionX = this.settings.get_double('image-position-x');
        let imagePositionY = this.settings.get_double('image-position-y');
        let imageSize = this.settings.get_int('image-size');

        // 显示文本
        for (let monitor of Main.layoutManager.monitors) {
            let label_1 = new St.Label({ style_class: 'label-1', text: text1 });
            let label_2 = new St.Label({ style_class: 'label-2', text: text2 });

            label_1.set_style(`font-size: ${size1}px;`);
            label_2.set_style(`font-size: ${size2}px;`);
            label_1.opacity = opacity;
            label_2.opacity = opacity;

            let params = {
                "trackFullscreen": false,
                "affectsStruts": false,
                "affectsInputRegion": true
            };

            Main.layoutManager.addTopChrome(label_1, params);
            Main.layoutManager.addTopChrome(label_2, params);

            this.labels.push(label_1, label_2);

            let h = Math.max(0, Math.floor(monitor.height * vl2 - label_2.height));
            let w = Math.max(0, Math.floor(monitor.width * hl2 - label_2.width));

            label_2.set_position(monitor.x + w, monitor.y + h);
            label_1.set_position(
                Math.min(monitor.x + w, monitor.x + monitor.width - label_1.width),
                monitor.y + h - label_1.height
            );
        }

        // 智能更新图片：只有图片路径改变时才重新创建，否则只更新属性
        this.updateImage(imagePath, imageOpacity, imagePositionX, imagePositionY, imageSize);

        // 延迟更新面板布局
        this.schedulePanelUpdate();
    }

    // 安排面板更新（避免立即操作导致的分配错误）
    schedulePanelUpdate() {
        if (this._panelUpdateTimeoutId) {
            GLib.source_remove(this._panelUpdateTimeoutId);
        }

        this._panelUpdateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this.updatePanelLayout();
            this._panelUpdateTimeoutId = 0;
            return GLib.SOURCE_REMOVE;
        });
    }

    // 安全更新面板布局
    updatePanelLayout() {
        if (!this._isPanelReady || this._isUnlockDialogMode) {
            console.log('Panel not ready or in unlock mode, skipping layout update');
            return;
        }

        try {
            const datetimeMoved = this.settings.get_boolean('datetime-moved');
            const extensionCentered = this.settings.get_boolean('extension-centered');
            const currentState = this.getCurrentPanelState();

            // 检查面板元素是否已分配
            if (!this.isPanelAllocated()) {
                console.log('Panel elements not allocated yet, retrying...');
                this.schedulePanelUpdate();
                return;
            }

            // 更新日期时间位置：只有在需要改变时才动作
            if (datetimeMoved && currentState.datetimePosition !== 'left') {
                this.moveDateTimeToLeft();
            } else if (!datetimeMoved && currentState.datetimePosition !== 'center') {
                this.restoreDateTime();
            }

            // 更新扩展按钮位置：只有在需要改变时才动作
            if (extensionCentered && currentState.extensionPosition !== 'center') {
                this.moveExtensionToCenter();
            } else if (!extensionCentered && currentState.extensionPosition !== 'right') {
                this.restoreExtension();
            }

        } catch (error) {
            console.error('Error updating panel layout:', error);
        }
    }

    // 检查面板元素是否已分配
    isPanelAllocated() {
        try {
            if (!Main.panel || !Main.panel._leftBox || !Main.panel._centerBox || !Main.panel._rightBox) {
                return false;
            }

            // 检查关键元素是否已分配
            const dateTimeMenu = this.findDateTimeMenu();
            if (dateTimeMenu && !dateTimeMenu.get_allocation_box) {
                return false;
            }

            return Main.panel.get_allocation_box() !== null;
        } catch (error) {
            return false;
        }
    }

    updateImage(imagePath, imageOpacity, imagePositionX, imagePositionY, imageSize) {
        // 如果图片路径改变或图片不存在，重新创建
        if (!this.imageActor || this._currentImagePath !== imagePath) {
            this.cleanupImage();
            this._currentImagePath = imagePath;

            if (imagePath && imagePath !== '') {
                // 延迟加载新图片
                if (this._addImageId) {
                    GLib.source_remove(this._addImageId);
                }

                this._addImageId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                    this.addImageToStage(imagePath, imageOpacity, imagePositionX, imagePositionY, imageSize);
                    this._addImageId = 0;
                    return GLib.SOURCE_REMOVE;
                });
            }
        }
        // 如果图片已存在，只更新属性
        else if (this.imageActor) {
            this.updateImageProperties(imageOpacity, imagePositionX, imagePositionY, imageSize);
        }
    }

    // 只更新文本的方法
    updateTextOnly() {
        this.cleanupLabels();

        // 获取文本设置
        let text1 = this.settings.get_string('text-l1') || 'Activate GNOME';
        let text2 = this.settings.get_string('text-l2') || 'Go to Settings to activate GNOME.';
        let vl2 = this.settings.get_double('l2-vertical');
        let hl2 = this.settings.get_double('l2-horizontal');
        let size1 = this.settings.get_double('size-l1');
        let size2 = this.settings.get_double('size-l2');
        let opacity = this.settings.get_double('opacity');

        // 显示文本（与原来相同的逻辑）
        for (let monitor of Main.layoutManager.monitors) {
            let label_1 = new St.Label({ style_class: 'label-1', text: text1 });
            let label_2 = new St.Label({ style_class: 'label-2', text: text2 });

            label_1.set_style(`font-size: ${size1}px;`);
            label_2.set_style(`font-size: ${size2}px;`);
            label_1.opacity = opacity;
            label_2.opacity = opacity;

            let params = {
                "trackFullscreen": false,
                "affectsStruts": false,
                "affectsInputRegion": true
            };

            Main.layoutManager.addTopChrome(label_1, params);
            Main.layoutManager.addTopChrome(label_2, params);

            this.labels.push(label_1, label_2);

            let h = Math.max(0, Math.floor(monitor.height * vl2 - label_2.height));
            let w = Math.max(0, Math.floor(monitor.width * hl2 - label_2.width));

            label_2.set_position(monitor.x + w, monitor.y + h);
            label_1.set_position(
                Math.min(monitor.x + w, monitor.x + monitor.width - label_1.width),
                monitor.y + h - label_1.height
            );
        }

        console.log('Text updated only');
    }

    // 只更新图片的方法
    updateImageOnly() {
        let imagePath = this.settings.get_string('selected-image');
        let imageOpacity = this.settings.get_double('image-opacity') / 255.0;
        let imagePositionX = this.settings.get_double('image-position-x');
        let imagePositionY = this.settings.get_double('image-position-y');
        let imageSize = this.settings.get_int('image-size');

        // 直接调用现有的 updateImage 方法
        this.updateImage(imagePath, imageOpacity, imagePositionX, imagePositionY, imageSize);
        console.log('Image updated only');
    }

    updateImageProperties(imageOpacity, imagePositionX, imagePositionY, imageSize) {
        if (!this.imageActor || !this._currentImagePath || !this._iconContent) return;

        try {
            const stage = global.stage;
            if (!stage) return;

            // 重新计算尺寸
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file(this._currentImagePath);
            let originalWidth = pixbuf.get_width();
            let originalHeight = pixbuf.get_height();

            let scale = imageSize / Math.max(originalWidth, originalHeight);
            let scaledWidth = Math.round(originalWidth * scale);
            let scaledHeight = Math.round(originalHeight * scale);

            console.log(`更新图片尺寸: ${scaledWidth}x${scaledHeight}`);

            // 检查是否达到 GNOME Shell 的尺寸限制
            const MAX_DIMENSION = 4096; // GNOME Shell 可能的最大尺寸
            if (scaledWidth > MAX_DIMENSION || scaledHeight > MAX_DIMENSION) {
                console.log(`达到尺寸限制，已裁剪: ${scaledWidth}x${scaledHeight}`);
                scaledWidth = Math.min(scaledWidth, MAX_DIMENSION);
                scaledHeight = Math.min(scaledHeight, MAX_DIMENSION);
            }

            // 更新容器尺寸
            this.imageActor.set_size(scaledWidth, scaledHeight);

            // 更新图标尺寸和基准尺寸
            this._iconContent.set_size(scaledWidth, scaledHeight);
            this._iconContent.icon_size = Math.max(scaledWidth, scaledHeight);

            // 更新位置
            const desktopWidth = stage.width;
            const desktopHeight = stage.height;
            const imageX = Math.round((desktopWidth * imagePositionX) - (scaledWidth / 2));
            const imageY = Math.round((desktopHeight * imagePositionY) - (scaledHeight / 2));
            this.imageActor.set_position(imageX, imageY);

            // 更新透明度
            this.imageActor.set_opacity(imageOpacity * 255);

            console.log(`实际显示尺寸: ${this.imageActor.width}x${this.imageActor.height}`);

        } catch (error) {
            console.error('更新图片属性失败:', error);
        }
    }

    addImageToStage(imagePath, imageOpacity, imagePositionX, imagePositionY, imageSize) {
        if (!imagePath || imagePath === '') return;

        console.log(`Adding image to stage: ${imagePath}`);

        try {
            let file = Gio.File.new_for_path(imagePath);
            if (!file.query_exists(null)) {
                console.log(`Image file not found: ${imagePath}`);
                return;
            }

            // 使用 GdkPixbuf 获取图片原始尺寸
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file(imagePath);
            let originalWidth = pixbuf.get_width();
            let originalHeight = pixbuf.get_height();

            // 计算保持比例的缩放尺寸
            let scale = imageSize / Math.max(originalWidth, originalHeight);
            let scaledWidth = Math.round(originalWidth * scale);
            let scaledHeight = Math.round(originalHeight * scale);

            console.log(`计算尺寸: ${scaledWidth}x${scaledHeight}`);

            // 创建容器 Actor
            let container = new Clutter.Actor();
            container.set_size(scaledWidth, scaledHeight);
            container.set_opacity(imageOpacity * 255);
            container.set_reactive(false);

            // 创建 St.Icon 作为图片内容
            let icon = new St.Icon({
                gicon: new Gio.FileIcon({ file: file }),
                icon_size: Math.max(scaledWidth, scaledHeight), // 使用最大边作为基准
                reactive: false
            });

            // 将图标添加到容器
            container.add_child(icon);

            // 关键：让图标填充整个容器
            icon.set_width(scaledWidth);
            icon.set_height(scaledHeight);
            icon.set_position(0, 0);

            // 设置位置
            const stage = global.stage;
            if (!stage) {
                console.log('Stage not available, retrying...');
                let retryId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                    this.addImageToStage(imagePath, imageOpacity, imagePositionX, imagePositionY, imageSize);
                    return GLib.SOURCE_REMOVE;
                });
                this.handlers.push({
                    owner: null,
                    id: retryId,
                    isTimeout: true
                });
                return;
            }

            const desktopWidth = stage.width;
            const desktopHeight = stage.height;

            const imageX = Math.round((desktopWidth * imagePositionX) - (scaledWidth / 2));
            const imageY = Math.round((desktopHeight * imagePositionY) - (scaledHeight / 2));

            container.set_position(imageX, imageY);
            stage.add_child(container);
            container.show();

            this.imageActor = container;
            this._iconContent = icon; // 保存图标引用

            console.log(`实际显示尺寸: ${container.width}x${container.height}`);
            console.log('Image successfully updated with container method');

        } catch (error) {
            console.error(`Failed to load image: ${imagePath}`, error);
        }
    }

    //cleanupLabels() {
    //    for (let label of this.labels) {
    //        try {
    //            if (label && label.get_parent && label.get_parent()) {
    //                Main.layoutManager.removeChrome(label);
    //            }
    //            if (label && label.destroy) {
    //                label.destroy();
    //            }
    //        } catch (e) {
    //            console.error('Error cleaning up label:', e);
    //        }
    //    }
    //    this.labels = [];
    //}
    cleanupLabels() {
        // 使用延迟清理避免冲突
        const labelsToRemove = [...this.labels];
        this.labels = [];

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5, () => {
            for (let label of labelsToRemove) {
                try {
                    if (label && label.get_parent && label.get_parent()) {
                        Main.layoutManager.removeChrome(label);
                    }
                    if (label && label.destroy) {
                        label.destroy();
                    }
                } catch (e) {
                    // 忽略清理错误
                }
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    cleanupImage() {
        if (this.imageActor) {
            try {
                const stage = global.stage;
                if (stage && this.imageActor.get_parent() === stage) {
                    stage.remove_child(this.imageActor);
                }
                this.imageActor.destroy();
            } catch (e) {
                console.error('Error cleaning up image:', e);
            }
            this.imageActor = null;
            this._iconContent = null;
        }

        if (this._addImageId) {
            GLib.source_remove(this._addImageId);
            this._addImageId = 0;
        }
    }

    // GNOME 48 兼容的日期时间组件查找方法
    findDateTimeMenu() {
        if (this.dateTimeMenu) return this.dateTimeMenu;

        // 在 GNOME 48 中，日期时间通常在中间区域
        try {
            // 方法1：查找中间面板中的日期时间组件
            for (let child of Main.panel._centerBox.get_children()) {
                const className = child.constructor.name;
                if (className.includes('DateMenu') ||
                    className.includes('Calendar') ||
                    className.includes('DateTime') ||
                    (child._date && child._clock)) {
                    this.dateTimeMenu = child;
                    console.log('Found date time in center box');
                    break;
                }
            }

            // 方法2：通过状态区域查找
            if (!this.dateTimeMenu) {
                const statusArea = Main.panel.statusArea;
                for (let key in statusArea) {
                    if (key.includes('dateMenu') || key.includes('calendar')) {
                        this.dateTimeMenu = statusArea[key];
                        console.log('Found date time in status area:', key);
                        break;
                    }
                }
            }

            // 方法3：通用查找
            if (!this.dateTimeMenu) {
                const centerChildren = Main.panel._centerBox.get_children();
                if (centerChildren.length > 0) {
                    // 通常中间区域只有一个元素就是日期时间
                    this.dateTimeMenu = centerChildren[0];
                    console.log('Assuming first center child is date time');
                }
            }
        } catch (error) {
            console.error('Error finding date time menu:', error);
        }

        return this.dateTimeMenu;
    }

    // 查找中间区域
    findCenterBox() {
        if (this.centerBox) return this.centerBox;

        try {
            // 查找中间区域
            for (let child of Main.panel._centerBox.get_children()) {
                if (child.constructor.name === 'BoxLayout') {
                    this.centerBox = child;
                    break;
                }
            }

            if (!this.centerBox) {
                this.centerBox = Main.panel._centerBox;
            }
        } catch (error) {
            console.error('Error finding center box:', error);
            this.centerBox = Main.panel._centerBox;
        }

        return this.centerBox;
    }

    // 添加辅助方法检查当前状态
    getCurrentPanelState() {
        const dateTimeMenu = this.findDateTimeMenu();
        const extensionButton = this.panelButton;

        let datetimePosition = 'center';
        let extensionPosition = 'right';

        if (dateTimeMenu) {
            if (dateTimeMenu.get_parent() === Main.panel._leftBox) {
                datetimePosition = 'left';
            } else if (dateTimeMenu.get_parent() === Main.panel._centerBox) {
                datetimePosition = 'center';
            } else if (dateTimeMenu.get_parent() === Main.panel._rightBox) {
                datetimePosition = 'right';
            }
        }

        if (extensionButton) {
            if (extensionButton.get_parent() === Main.panel._centerBox) {
                extensionPosition = 'center';
            } else {
                extensionPosition = 'right'; // 默认在右边
            }
        }

        return { datetimePosition, extensionPosition };
    }

    // 移动日期时间到左边（第二个位置） - GNOME 48 专用
    moveDateTimeToLeft() {
        const dateTimeMenu = this.findDateTimeMenu();
        if (!dateTimeMenu) {
            console.log('DateTime menu not found');
            return false;
        }

        // 检查是否已经在正确的位置（左边第二个）
        const currentState = this.getCurrentPanelState();
        if (currentState.datetimePosition === 'left') {
            console.log('DateTime already on left side, no action needed');
            return true;
        }

        // 保存原始位置（中间）
        if (!this.originalDateTimePosition) {
            this.originalDateTimePosition = {
                parent: dateTimeMenu.get_parent(),
                index: dateTimeMenu.get_parent().get_children().indexOf(dateTimeMenu)
            };
        }

        try {
            // 从当前位置移除
            if (dateTimeMenu.get_parent()) {
                dateTimeMenu.get_parent().remove_child(dateTimeMenu);
            }

            // 添加到左边区域，放在第二个位置（活动状态条后面）
            const leftBox = Main.panel._leftBox;
            const leftChildren = leftBox.get_children();

            // 插入到第二个位置（索引1）
            let insertIndex = 1;

            // 如果左边子元素少于2个，就添加到末尾
            if (leftChildren.length < 2) {
                insertIndex = leftChildren.length;
            }

            leftBox.insert_child_at_index(dateTimeMenu, insertIndex);

            console.log('Date/Time moved to left (position 2) successfully');
            return true;
        } catch (error) {
            console.error('Error moving date time menu to left:', error);
            return false;
        }
    }

    // 恢复日期时间到中间
    restoreDateTime() {
        const dateTimeMenu = this.findDateTimeMenu();
        if (!dateTimeMenu || !this.originalDateTimePosition) {
            return false;
        }

        // 检查是否已经在原始位置（中间）
        if (dateTimeMenu.get_parent() === this.originalDateTimePosition.parent) {
            return true;
        }

        try {
            // 从当前位置移除
            if (dateTimeMenu.get_parent()) {
                dateTimeMenu.get_parent().remove_child(dateTimeMenu);
            }

            // 恢复到原始位置（中间）
            const originalParent = this.originalDateTimePosition.parent;
            if (originalParent && originalParent.insert_child_at_index) {
                originalParent.insert_child_at_index(dateTimeMenu, this.originalDateTimePosition.index);
                console.log('Date/Time restored to center successfully');
                return true;
            }
        } catch (error) {
            console.error('Error restoring date time menu to center:', error);
        }
        return false;
    }

    // 移动扩展按钮到中间
    // 修正：移动扩展按钮到中间的方法（移除冲突检查）
    moveExtensionToCenter() {
        if (!this.panelButton) {
            return false;
        }

        // 检查是否已经在中间
        const currentState = this.getCurrentPanelState();
        if (currentState.extensionPosition === 'center') {
            console.log('Extension already centered, no action needed');
            return true;
        }

        // 移除日期时间在中间的冲突检查
        // 因为日期时间移到左边后，中间区域是空的

        // 保存原始位置
        if (!this.originalExtensionPosition) {
            this.originalExtensionPosition = {
                parent: this.panelButton.get_parent(),
                index: this.panelButton.get_parent().get_children().indexOf(this.panelButton)
            };
        }

        try {
            // 从当前位置移除
            if (this.panelButton.get_parent()) {
                this.panelButton.get_parent().remove_child(this.panelButton);
            }

            // 添加到中间区域
            const centerBox = this.findCenterBox();
            centerBox.add_child(this.panelButton);

            console.log('Extension moved to center successfully');
            return true;
        } catch (error) {
            console.error('Error moving extension to center:', error);
            return false;
        }
    }

    // 恢复扩展按钮位置
    restoreExtension() {
        if (!this.panelButton || !this.originalExtensionPosition) {
            return false;
        }

        // 检查是否已经在原始位置
        if (this.panelButton.get_parent() === this.originalExtensionPosition.parent) {
            return true;
        }

        try {
            // 从当前位置移除
            if (this.panelButton.get_parent()) {
                this.panelButton.get_parent().remove_child(this.panelButton);
            }

            // 恢复到原始位置
            const originalParent = this.originalExtensionPosition.parent;
            if (originalParent && originalParent.insert_child_at_index) {
                originalParent.insert_child_at_index(this.panelButton, this.originalExtensionPosition.index);
                console.log('Extension restored successfully');
                return true;
            }
        } catch (error) {
            console.error('Error restoring extension position:', error);
        }
        return false;
    }

    createPanelButton() {
        this.panelButton = new PanelMenu.Button(0.0, "Activate GNOME Settings");

        let icon;
        try {
            const iconFile = Gio.File.new_for_path(this.path + '/icons/system-icon.svg');
            if (iconFile.query_exists(null)) {
                icon = new St.Icon({
                    gicon: Gio.icon_new_for_string(this.path + '/icons/system-icon.svg'),
                    style_class: 'system-icon'
                });
            } else {
                throw new Error('Custom icon not found');
            }
        } catch (error) {
            icon = new St.Icon({
                icon_name: 'preferences-system-symbolic',
                style_class: 'system-status-icon'
            });
        }

        this.panelButton.add_child(icon);

        this.panelButton.connect('button-press-event', (actor, event) => {
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                this.openPreferences();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        Main.panel.addToStatusArea(this.uuid, this.panelButton);
    }

    openPreferences() {
        try {
            let [success, argv] = GLib.shell_parse_argv(`gnome-extensions prefs ${this.uuid}`);
            if (success) {
                let flags = GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD;
                GLib.spawn_async(null, argv, null, flags, null);
                return;
            }
        } catch (error) {
            console.error('Method 1 failed:', error);
        }

        try {
            let [success, argv] = GLib.shell_parse_argv('gnome-shell-extension-prefs');
            if (success) {
                let flags = GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD;
                GLib.spawn_async(null, argv, null, flags, null);
            }
        } catch (fallbackError) {
            console.error('All methods failed:', fallbackError);
        }
    }

    enable() {
        // DateTime Format Start
        const dateMenu = Main.panel.statusArea.dateMenu;
        const clockDisplayBox = dateMenu
            .get_children()
            .find((x) => x.style_class === "clock-display-box");

        this.clocklabel = clockDisplayBox?.get_children().find(
            (x) => x.style_class === "clock"
        );

        if (!this.clocklabel) {
            console.error("No clock label? Aborting.");
            return;
        }

        const gnomeSettings = Gio.Settings.new("org.gnome.desktop.interface");
        this.gnomeCalendar = Gio.Settings.new("org.gnome.desktop.calendar");

        const override = () => {
            // Don't do anything if the clock label hasn't actually changed
            if (this.newClock == this.clocklabel.get_text()) {
                return;
            }

            // Setup the custom clock format based on the clock settings in Gnome Settings
            let day, date, week, time;

            if (gnomeSettings.get_boolean("clock-show-weekday")) {
                day = "%A"
            }
            if (gnomeSettings.get_boolean("clock-show-date")) {
                date = "%Y-%m-%d";
            }
            if (this.gnomeCalendar.get_boolean("show-weekdate")) {
                week = "W%V-%u"
            }
            if (gnomeSettings.get_string("clock-format") === '24h') {
                time = "%H:%M";
            } else {
                time = "%I:%M %p";
            }
            if (gnomeSettings.get_boolean("clock-show-seconds")) {
                time = time.replace("%M", "%M:%S");
            }

            const format = [day, date, week, time].filter(v => v).join("   ");

            // Keep a copy of the default clock text so that we can revert it when the
            // extension is disabled
            this.defaultClock = this.clocklabel.get_text();

            // Set the clock label to our new custom format
            const now = GLib.DateTime.new_now_local();
            this.newClock = now.format(format);
            this.clocklabel.set_text(this.newClock);
        };

        // Whenever the clock label updates override with our custom clock format
        this.labelHandleId = this.clocklabel.connect("notify::text", override);

        // 我们还需要知道"周数"设置何时更改，因为周数不会出现在默认时钟中
        this.calendarHandleId = this.gnomeCalendar.connect("changed::show-weekdate", () => {
            this.clocklabel.set_text(this.defaultClock);
        })
        override();
        // DateTime Format End

        this.settings = this.getSettings();
        this.createPanelButton();

        // 初始化会话模式状态
        this._isUnlockDialogMode = (Main.sessionMode.currentMode === 'unlock-dialog');
        console.log(`Initial session mode: ${Main.sessionMode.currentMode}`);

        // 连接会话模式变化信号
        this._sessionId = Main.sessionMode.connect('updated', this._onSessionModeChanged.bind(this));

        // 等待面板准备就绪
        this._isPanelReady = false;

        //// 连接设置变化信号（在锁屏模式下阻塞）
        //this.handlers.push({
        //    owner: this.settings,
        //    id: this.settings.connect('changed', () => {
        //        if (!this._isUnlockDialogMode) {
        //            this.update();
        //        }
        //    })
        //});
        this.handlers.push({
            owner: this.settings,
            id: this.settings.connect('changed', (settings, key) => {
                console.log(`Setting changed: ${key}`);

                // 根据改变的设置键决定更新策略
                const textKeys = ['text-l1', 'text-l2', 'size-l1', 'size-l2', 'l2-vertical', 'l2-horizontal', 'opacity'];
                const imageKeys = ['selected-image', 'image-opacity', 'image-position-x', 'image-position-y', 'image-size'];
                const panelKeys = ['datetime-moved', 'extension-centered'];

                if (textKeys.includes(key)) {
                    // 只更新文本
                    this.updateTextOnly();
                } else if (imageKeys.includes(key)) {
                    // 只更新图片
                    this.updateImageOnly();
                } else if (panelKeys.includes(key)) {
                    // 只更新面板布局
                    this.schedulePanelUpdate();
                } else {
                    // 未知设置键，执行完整更新
                    this.update();
                }
            })
        });

        this.handlers.push({
            owner: Main.layoutManager,
            id: Main.layoutManager.connect('monitors-changed', () => {
                if (!this._isUnlockDialogMode) {
                    this.update();
                }
            })
        });

        this._a11yIndicator = Main.panel.statusArea.a11y;
        if (this._a11yIndicator) {
            this._a11yIndicator.hide();
        }

        // 延迟初始化以确保所有元素都已加载
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._isPanelReady = true;
            if (!this._isUnlockDialogMode) {
                this.update();
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    disable() {
        // 时钟格式化清理代码
        if (this.calendarHandleId) {
            this.gnomeCalendar.disconnect(this.calendarHandleId);
            this.calendarHandleId = null;
        }

        if (this.labelHandleId) {
            this.clocklabel.disconnect(this.labelHandleId);
            this.labelHandleId = null;
        }

        if (this.defaultClock) {
            this.clocklabel.set_text(this.defaultClock);
        }

        this.gnomeCalendar = null
        this.clocklabel = null;
        this.newClock = null;
        this.defaultClock = null;
        // End of Clock

        // 设置标志防止任何更新操作
        this._updateBlocked = true;
        this._isUnlockDialogMode = false;

        this.cleanupLabels();
        this.cleanupImage();

        // 取消面板更新定时器
        if (this._panelUpdateTimeoutId) {
            GLib.source_remove(this._panelUpdateTimeoutId);
            this._panelUpdateTimeoutId = 0;
        }

        // 安全恢复面板布局
        try {
            if (this.settings) {
                if (this.settings.get_boolean('datetime-moved')) {
                    this.restoreDateTime();
                }
                if (this.settings.get_boolean('extension-centered')) {
                    this.restoreExtension();
                }
            }
        } catch (error) {
            console.error('Error during disable cleanup:', error);
        }

        if (this.panelButton) {
            try {
                this.panelButton.destroy();
            } catch (error) {
                console.error('Error destroying panel button:', error);
            }
            this.panelButton = null;
        }

        if (this._a11yIndicator) {
            try {
                this._a11yIndicator.show();
            } catch (error) {
                console.error('Error showing a11y indicator:', error);
            }
        }

        // 断开所有信号连接
        for (let handler of this.handlers) {
            try {
                if (handler.isTimeout) {
                    if (handler.id) {
                        GLib.source_remove(handler.id);
                    }
                } else if (handler.owner && handler.id) {
                    handler.owner.disconnect(handler.id);
                }
            } catch (error) {
                console.error('Error disconnecting handler:', error);
            }
        }
        this.handlers = [];
        this.settings = null;
        this._isPanelReady = false;
    }
}
