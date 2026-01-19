import Gio from 'gi://Gio'
import Gtk from 'gi://Gtk'
import Adw from 'gi://Adw'

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class ActivateGnomeExtensionPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // 创建主页面
        const mainPage = new Adw.PreferencesPage({
            //title: 'Text Settings',
            title: 'SetText',
            icon_name: 'font-x-generic-symbolic'
        });
        window.add(mainPage);

        // 创建图片设置页面
        const imagePage = new Adw.PreferencesPage({
            title: 'SetImage',
            icon_name: 'image-x-generic-symbolic'
        });
        window.add(imagePage);

        // 创建面板布局设置页面
        const layoutPage = new Adw.PreferencesPage({
            title: 'SetPanel',
            icon_name: 'view-grid-symbolic'
        });
        window.add(layoutPage);

        this.settings = this.getSettings()

        // === 主设置页面（文本设置）使用 Grid 布局 ===
        const mainGroup = new Adw.PreferencesGroup();
        mainPage.add(mainGroup);

        let mainGrid = new Gtk.Grid({
            row_spacing: 8,
            column_spacing: 12,
            halign: Gtk.Align.FILL,
            hexpand: true,
            margin_top: 0,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });
        mainGrid.set_column_homogeneous(false);
        mainGroup.add(mainGrid);

        // 第一行：Line 1 Text
        //let label_line_1 = new Gtk.Label({
        //    label: '<b>Line 1 Text</b>',
        //    use_markup: true,
        //    halign: Gtk.Align.START,
        //    width_chars: 12,
        //});
        //mainGrid.attach(label_line_1, 0, 0, 1, 1);

        let entry_line_1 = new Gtk.Entry({
            hexpand: true,
            placeholder_text: 'Enter line 1 text here...'
        });
        entry_line_1.set_width_chars(30);
        mainGrid.attach(entry_line_1, 0, 0, 3, 1);  // 跨两列

        // 第二行：Line 2 Text
        //let label_line_2 = new Gtk.Label({
        //    label: '<b>Line 2 Text</b>',
        //    use_markup: true,
        //    halign: Gtk.Align.START,
        //    width_chars: 12,
        //});
        //mainGrid.attach(label_line_2, 0, 1, 1, 1);

        let entry_line_2 = new Gtk.Entry({
            hexpand: true,
            placeholder_text: 'Enter line 2 text here...'
        });
        entry_line_2.set_width_chars(30);
        mainGrid.attach(entry_line_2, 0, 1, 3, 1);  // 跨两列

        // 第三行：字体大小设置
        //let label_font_size = new Gtk.Label({
        //    label: '<b>Font Size</b>',
        //    use_markup: true,
        //    halign: Gtk.Align.START,
        //    width_chars: 12,
        //});
        //mainGrid.attach(label_font_size, 0, 2, 1, 1);

        // Line 1 字体大小
        let fontSizeContainer = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            hexpand: true,
            halign: Gtk.Align.FILL,
        });
        mainGrid.attach(fontSizeContainer, 0, 2, 3, 1);  // 跨三列

        // Line 1 字体大小（左对齐）
        let size1Box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            halign: Gtk.Align.START,
        });
        fontSizeContainer.append(size1Box);

        let label_line_1_size = new Gtk.Label({
            label: 'Line1 Size:',
            halign: Gtk.Align.START,
        });
        size1Box.append(label_line_1_size);

        let spinbutton_line_1_text_size = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1.0,
                upper: 65535.0,
                value: this.settings.get_double('size-l1'),
                step_increment: 1.0,
                page_increment: 10.0
            }),
            numeric: true,
            digits: 0,
        });
        size1Box.append(spinbutton_line_1_text_size);

        // 中间的空隙（自动扩展）
        let middleSpacer = new Gtk.Box({
            hexpand: true
        });
        fontSizeContainer.append(middleSpacer);

        // Line 2 字体大小（右对齐）
        let size2Box = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            halign: Gtk.Align.END,
        });
        fontSizeContainer.append(size2Box);

        let spinbutton_line_2_text_size = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1.0,
                upper: 65535.0,
                value: this.settings.get_double('size-l2'),
                step_increment: 1.0,
                page_increment: 10.0
            }),
            numeric: true,
            digits: 0,
        });
        size2Box.append(spinbutton_line_2_text_size);

        let label_line_2_size = new Gtk.Label({
            label: ':Line2 Size',
            halign: Gtk.Align.END,
        });
        size2Box.append(label_line_2_size);

        // 第四行：垂直位置
        let label_vertical = new Gtk.Label({
            label: '<b>Vertical</b>',
            use_markup: true,
            halign: Gtk.Align.START,
            width_chars: 6,
            margin_start: 0,
        });
        mainGrid.attach(label_vertical, 0, 3, 1, 1);

        let scale_line_2_vertical_position = new Gtk.Scale({
            adjustment: new Gtk.Adjustment({
                lower: 0.01,
                upper: 1.0,
                value: this.settings.get_double('l2-vertical'),
                step_increment: 0.01,
                page_increment: 0.1
            }),
            draw_value: false,
            digits: 2,
            hexpand: true,
            halign: Gtk.Align.FILL,
        });
        mainGrid.attach(scale_line_2_vertical_position, 1, 3, 1, 1);

        let value_vertical = new Gtk.Label({
            label: this.settings.get_double('l2-vertical').toFixed(2),
            halign: Gtk.Align.END,
            width_chars: 5,
        });
        mainGrid.attach(value_vertical, 2, 3, 1, 1);

        // 第五行：水平位置
        let label_horizontal = new Gtk.Label({
            label: '<b>Horizontal</b>',
            use_markup: true,
            halign: Gtk.Align.START,
            width_chars: 6,
        });
        mainGrid.attach(label_horizontal, 0, 4, 1, 1);

        let scale_line_2_horizontal_position = new Gtk.Scale({
            adjustment: new Gtk.Adjustment({
                lower: 0.01,
                upper: 1.0,
                value: this.settings.get_double('l2-horizontal'),
                step_increment: 0.01,
                page_increment: 0.1
            }),
            draw_value: false,
            digits: 2,
            hexpand: true,
        });
        mainGrid.attach(scale_line_2_horizontal_position, 1, 4, 1, 1);

        let value_horizontal = new Gtk.Label({
            label: this.settings.get_double('l2-horizontal').toFixed(2),
            halign: Gtk.Align.END,
            width_chars: 5,
        });
        mainGrid.attach(value_horizontal, 2, 4, 1, 1);

        // 第六行：透明度
        let label_opacity = new Gtk.Label({
            label: '<b>Opacity</b>',
            use_markup: true,
            halign: Gtk.Align.START,
            width_chars: 6,
        });
        mainGrid.attach(label_opacity, 0, 5, 1, 1);

        let scale_opacity = new Gtk.Scale({
            adjustment: new Gtk.Adjustment({
                lower: 0.1,
                upper: 255,
                value: this.settings.get_double('opacity'),
                step_increment: 0.1,
                page_increment: 1
            }),
            draw_value: false,
            digits: 1,
            hexpand: true,
        });
        mainGrid.attach(scale_opacity, 1, 5, 1, 1);

        let value_opacity = new Gtk.Label({
            label: this.settings.get_double('opacity').toFixed(1),
            halign: Gtk.Align.END,
            width_chars: 5,
        });
        mainGrid.attach(value_opacity, 2, 5, 1, 1);

        // 第七行：重置按钮
        let button_reset = new Gtk.Button({
            label: 'Reset Text Settings',
            halign: Gtk.Align.CENTER,
            margin_top: 12,
        });
        mainGrid.attach(button_reset, 0, 6, 3, 1);
        
        // === 添加重置按钮点击事件 ===
        button_reset.connect('clicked', () => {
            this.settings.reset('text-l1');
            this.settings.reset('text-l2');
            this.settings.reset('size-l1');
            this.settings.reset('size-l2');
            this.settings.reset('l2-vertical');
            this.settings.reset('l2-horizontal');
            this.settings.reset('opacity');
            
            this.showToast(window, 'Text settings reset to defaults');
        });

        // 绑定设置
        this.settings.bind('text-l1', entry_line_1, 'text', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('text-l2', entry_line_2, 'text', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('size-l1', spinbutton_line_1_text_size.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('size-l2', spinbutton_line_2_text_size.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('l2-vertical', scale_line_2_vertical_position.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('l2-horizontal', scale_line_2_horizontal_position.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('opacity', scale_opacity.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);

        // 实时数值更新
        scale_line_2_vertical_position.connect('value-changed', (scale) => {
            const value = scale.get_value();
            value_vertical.set_label(value.toFixed(2));
            this.settings.set_double('l2-vertical', value);
        });

        scale_line_2_horizontal_position.connect('value-changed', (scale) => {
            const value = scale.get_value();
            value_horizontal.set_label(value.toFixed(2));
            this.settings.set_double('l2-horizontal', value);
        });

        scale_opacity.connect('value-changed', (scale) => {
            const value = scale.get_value();
            value_opacity.set_label(value.toFixed(1));
            this.settings.set_double('opacity', value);
        });

        // 设置变化时也更新显示
        this.settings.connect('changed::l2-vertical', () => {
            value_vertical.set_label(this.settings.get_double('l2-vertical').toFixed(2));
        });

        this.settings.connect('changed::l2-horizontal', () => {
            value_horizontal.set_label(this.settings.get_double('l2-horizontal').toFixed(2));
        });

        this.settings.connect('changed::opacity', () => {
            value_opacity.set_label(this.settings.get_double('opacity').toFixed(1));
        });

        // === 图片设置页面 ===
        const imageGroup = new Adw.PreferencesGroup();
        imagePage.add(imageGroup);

        let imageContainer = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
            margin_top: 0,
            margin_bottom: 0,
            margin_start: 12,
            margin_end: 12,
        });

        // 图片选择部分
        let imageSelectionBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
            margin_top: 0,
            margin_bottom: 0,
        });
        imageContainer.append(imageSelectionBox);

        //let imageDescriptionLabel = new Gtk.Label({
        //    //label: 'Display Size (pixels)',
        //    halign: Gtk.Align.CENTER,
        //    wrap: true,
        //    margin_top: 0,
        //    margin_bottom: 0,
        //});
        //imageSelectionBox.append(imageDescriptionLabel);

        let buttonBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 0,
            margin_top: 0,
            margin_bottom: 0,
            halign: Gtk.Align.CENTER,
        });
        imageSelectionBox.append(buttonBox);

        let selectImageButton = new Gtk.Button({
            label: 'Select',
            css_classes: ['suggested-action'],
        });
        buttonBox.append(selectImageButton);

        //=========================================
        //let label_image_size = new Gtk.Label({
        //    label: '<b>Display Size (pixels)</b>',
        //    use_markup: true,
        //    halign: Gtk.Align.CENTER,  // 2b. 区中显示
        //});
        //imageSizeBox.append(label_image_size);
        let spinbutton_image_size = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 10,
                upper: 1048576,
                value: this.settings.get_int('image-size'),
                step_increment: 10,
                page_increment: 100
            }),
            numeric: true,
            digits: 0,
            halign: Gtk.Align.CENTER,
        });
        buttonBox.append(spinbutton_image_size);
        //=========================================

        let resetImageButton = new Gtk.Button({
            label: 'ClearImage',
            sensitive: false,
        });
        buttonBox.append(resetImageButton);
        // 重置图片设置按钮
        let button_reset_image = new Gtk.Button({
            label: 'Restore',
            margin_top: 0,
            margin_bottom: 0,
            halign: Gtk.Align.CENTER,
        });
        buttonBox.append(button_reset_image);

        // 图片预览区域
        let imageFrame = new Gtk.Frame({
            height_request: 180,
            width_request: 280,
            halign: Gtk.Align.CENTER,
            css_classes: ['card'],
            margin_top: 4,  // 2b. 减少间距
            margin_bottom: 1,
        });
        imageSelectionBox.append(imageFrame);

        let imageDisplay = new Gtk.Picture({
            height_request: 320,
            width_request: 320,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            can_shrink: true,
            keep_aspect_ratio: true,
        });
        imageFrame.set_child(imageDisplay);

        let imagePathLabel = new Gtk.Label({
            label: 'No image selected',
            wrap: true,
            justify: Gtk.Justification.CENTER,
            halign: Gtk.Align.CENTER,
            max_width_chars: 60,
            css_classes: ['dim-label', 'monospace'],
            margin_bottom: 0,  // 2b. 减少间距
        });
        imageSelectionBox.append(imagePathLabel);

        // 图片控制设置部分
        let imageControlsBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,  // 2b. 减少间距
            margin_top: 0,
            margin_bottom: 0,
        });
        imageContainer.append(imageControlsBox);

        // 图片控制设置部分 - 使用 Grid 布局实现行对齐
        let imageControlsGrid = new Gtk.Grid({
            row_spacing: 0,      // 行间距
            column_spacing: 12,  // 列间距
            halign: Gtk.Align.FILL,
            hexpand: true,
            margin_top: 1,
            margin_bottom: 1,
        });
        imageContainer.append(imageControlsGrid);

        // 设置列的最小宽度，确保对齐
        imageControlsGrid.set_column_homogeneous(false);

        // 第一行：图片透明度
        let label_image_opacity = new Gtk.Label({
            label: '<b>Opacity</b>',
            use_markup: true,
            halign: Gtk.Align.START,
            hexpand: false,
            width_chars: 10,  // 固定字符宽度确保对齐
        });
        imageControlsGrid.attach(label_image_opacity, 0, 0, 1, 1);

        let scale_image_opacity = new Gtk.Scale({
            adjustment: new Gtk.Adjustment({
                lower: 0.1,
                upper: 255,
                value: this.settings.get_double('image-opacity'),
                step_increment: 0.1,
                page_increment: 1
            }),
            draw_value: false,  // 不显示在进度条上
            digits: 1,
            hexpand: true,      // 扩展填充剩余空间
        });
        imageControlsGrid.attach(scale_image_opacity, 1, 0, 1, 1);

        let value_image_opacity = new Gtk.Label({
            label: this.settings.get_double('image-opacity').toFixed(1),
            halign: Gtk.Align.END,
            hexpand: false,
            width_chars: 6,     // 固定数值显示宽度
        });
        imageControlsGrid.attach(value_image_opacity, 2, 0, 1, 1);
        // 进度条变化时也更新数值显示
        scale_image_opacity.connect('value-changed', (scale) => {
            value_image_opacity.set_label(scale.get_value().toFixed(1));
        });

        // 第二行：水平位置
        let label_image_position_x = new Gtk.Label({
            label: '<b>Horizontal</b>',
            use_markup: true,
            halign: Gtk.Align.START,
            hexpand: false,
            width_chars: 10,    // 与第一行相同宽度
        });
        imageControlsGrid.attach(label_image_position_x, 0, 1, 1, 1);

        let scale_image_position_x = new Gtk.Scale({
            adjustment: new Gtk.Adjustment({
                lower: 0.0,
                upper: 1.0,
                value: this.settings.get_double('image-position-x'),
                step_increment: 0.01,
                page_increment: 0.1
            }),
            draw_value: false,
            digits: 2,
            hexpand: true,      // 扩展填充
        });
        imageControlsGrid.attach(scale_image_position_x, 1, 1, 1, 1);

        let value_image_position_x = new Gtk.Label({
            label: this.settings.get_double('image-position-x').toFixed(2),
            halign: Gtk.Align.END,
            hexpand: false,
            width_chars: 6,     // 与第一行相同宽度
        });
        imageControlsGrid.attach(value_image_position_x, 2, 1, 1, 1);
        scale_image_position_x.connect('value-changed', (scale) => {
            value_image_position_x.set_label(scale.get_value().toFixed(2));
        });


        // 第三行：垂直位置
        let label_image_position_y = new Gtk.Label({
            label: '<b>Vertical</b>',
            use_markup: true,
            halign: Gtk.Align.START,
            hexpand: false,
            width_chars: 10,    // 与第一行相同宽度
        });
        imageControlsGrid.attach(label_image_position_y, 0, 2, 1, 1);

        let scale_image_position_y = new Gtk.Scale({
            adjustment: new Gtk.Adjustment({
                lower: 0.0,
                upper: 1.0,
                value: this.settings.get_double('image-position-y'),
                step_increment: 0.01,
                page_increment: 0.1
            }),
            draw_value: false,
            digits: 2,
            hexpand: true,      // 扩展填充
        });
        imageControlsGrid.attach(scale_image_position_y, 1, 2, 1, 1);
        scale_image_position_y.connect('value-changed', (scale) => {
            value_image_position_y.set_label(scale.get_value().toFixed(2));
        });

        // 微调按钮变化时更新
        spinbutton_image_size.connect('value-changed', (spinbutton) => {
            value_image_size.set_label(spinbutton.get_value_as_int().toString() + ' px');
        });

        let value_image_position_y = new Gtk.Label({
            label: this.settings.get_double('image-position-y').toFixed(2),
            halign: Gtk.Align.END,
            hexpand: false,
            width_chars: 6,     // 与第一行相同宽度
        });
        imageControlsGrid.attach(value_image_position_y, 2, 2, 1, 1);

        // 设置变化时也同步更新（双向绑定）
        this.settings.connect('changed::image-opacity', () => {
            const value = this.settings.get_double('image-opacity');
            value_image_opacity.set_label(value.toFixed(1));
            // 确保进度条也同步
            if (Math.abs(scale_image_opacity.get_value() - value) > 0.01) {
                scale_image_opacity.set_value(value);
            }
        });

        imageGroup.add(imageContainer);

        // 选择图片按钮点击事件
        selectImageButton.connect('clicked', () => {
            const dialog = new Gtk.FileChooserDialog({
                title: 'Select an Image',
                transient_for: window,
                modal: true,
                action: Gtk.FileChooserAction.OPEN
            });

            dialog.add_button('_Cancel', Gtk.ResponseType.CANCEL);
            dialog.add_button('_Open', Gtk.ResponseType.ACCEPT);

            const filter = new Gtk.FileFilter();
            filter.add_pixbuf_formats();
            filter.set_name('Image files');
            dialog.set_filter(filter);

            dialog.connect('response', (dialog, response_id) => {
                if (response_id === Gtk.ResponseType.ACCEPT) {
                    const file = dialog.get_file();
                    if (file) {
                        const filePath = file.get_path();

                        imageDisplay.set_file(file);
                        imagePathLabel.set_label(filePath);

                        this.settings.set_string('selected-image', filePath);
                        resetImageButton.set_sensitive(true);
                    }
                }
                dialog.destroy();
            });

            dialog.present();
        });

        // 重置图片按钮点击事件
        resetImageButton.connect('clicked', () => {
            imageDisplay.set_file(null);
            imagePathLabel.set_label('No image selected');
            this.settings.set_string('selected-image', '');
            resetImageButton.set_sensitive(false);
        });

        // 重置图片设置按钮点击事件
        button_reset_image.connect('clicked', () => {
            this.settings.reset('image-opacity');
            this.settings.reset('image-position-x');
            this.settings.reset('image-position-y');
            this.settings.reset('image-size');
        });

        // 绑定图片设置
        this.settings.bind('image-opacity', scale_image_opacity.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('image-position-x', scale_image_position_x.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('image-position-y', scale_image_position_y.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        this.settings.bind('image-size', spinbutton_image_size.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);

        // 初始化时加载当前设置的图片
        const currentImagePath = this.settings.get_string('selected-image');
        if (currentImagePath && currentImagePath !== '') {
            const file = Gio.File.new_for_path(currentImagePath);
            if (file.query_exists(null)) {
                imageDisplay.set_file(file);
                imagePathLabel.set_label(currentImagePath);
                resetImageButton.set_sensitive(true);
            } else {
                this.settings.set_string('selected-image', '');
                imagePathLabel.set_label('Previous image not found');
            }
        }

        // === 面板布局设置页面 ===
        const layoutGroup = new Adw.PreferencesGroup({
            //title: 'Here can set an ICON in center as your brand',
            //description: 'Here can set an ICON in center as your brand'
        });
        layoutPage.add(layoutGroup);

        let layoutContainer = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 24,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });

        // 说明文字 - 3a. 区中显示
        let layoutDescriptionLabel = new Gtk.Label({
            label: 'Here can set an ICON in center as your brand.',
            halign: Gtk.Align.CENTER,  // 3a. 区中显示
            wrap: true,
            margin_bottom: 24,
        });
        layoutContainer.append(layoutDescriptionLabel);

        // 按钮容器
        let buttonsBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
        });
        layoutContainer.append(buttonsBox);

        // 按钮1：移动日期时间到左边
        let moveDateTimeButton = new Gtk.Button({
            label: 'Move Date/Time to Left (after activities)',
            css_classes: ['suggested-action'],
            halign: Gtk.Align.CENTER,
        });
        buttonsBox.append(moveDateTimeButton);

        // 按钮2：移动扩展按钮到中间
        let moveExtensionButton = new Gtk.Button({
            label: 'Move Extension to Center',
            css_classes: ['suggested-action'],
            halign: Gtk.Align.CENTER,
        });
        buttonsBox.append(moveExtensionButton);

        // 按钮3：恢复默认布局
        let restoreButton = new Gtk.Button({
            label: 'Restore Default Layout',
            css_classes: ['destructive-action'],
            halign: Gtk.Align.CENTER,
        });
        buttonsBox.append(restoreButton);

        // 状态显示
        let statusBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_top: 24,
        });
        layoutContainer.append(statusBox);

        let statusLabel = new Gtk.Label({
            label: '<b>Current Status:</b>',
            use_markup: true,
            halign: Gtk.Align.CENTER,  // 区中显示
        });
        statusBox.append(statusLabel);

        let statusDetails = new Gtk.Label({
            label: 'Date/Time: Original position | Extension: Original position',
            halign: Gtk.Align.CENTER,  // 区中显示
            wrap: true,
        });
        statusBox.append(statusDetails);

        // 更新状态显示
        const updateStatus = () => {
            const datetimeMoved = this.settings.get_boolean('datetime-moved');
            const extensionCentered = this.settings.get_boolean('extension-centered');

            const datetimeStatus = datetimeMoved ? 'Moved to left (position 2)' : 'Center (default)';
            const extensionStatus = extensionCentered ? 'Centered' : 'Right (default)';

            statusDetails.set_label(`Date/Time: ${datetimeStatus} | Extension: ${extensionStatus}`);
        };

        // 更新按钮状态的函数
        const updateButtonStates = () => {
            const datetimeMoved = this.settings.get_boolean('datetime-moved');
            const extensionCentered = this.settings.get_boolean('extension-centered');

            moveDateTimeButton.set_sensitive(!datetimeMoved);
            moveExtensionButton.set_sensitive(!extensionCentered);
            restoreButton.set_sensitive(datetimeMoved || extensionCentered);

            // 更新工具提示
            if (datetimeMoved) {
                moveDateTimeButton.set_tooltip_text('Date/Time is already on left side');
            } else {
                moveDateTimeButton.set_tooltip_text('Move Date/Time to left side (after activities)');
            }

            if (extensionCentered) {
                moveExtensionButton.set_tooltip_text('Extension is already centered');
            } else {
                moveExtensionButton.set_tooltip_text('Move extension to center');
            }

            if (!(datetimeMoved || extensionCentered)) {
                restoreButton.set_tooltip_text('Layout is already in default state');
            } else {
                restoreButton.set_tooltip_text('Restore to default layout');
            }
        };

        // 按钮点击事件
        moveDateTimeButton.connect('clicked', () => {
            const datetimeMoved = this.settings.get_boolean('datetime-moved');
            if (datetimeMoved) {
                this.showToast(window, 'Date/Time is already on left side');
                return;
            }

            this.settings.set_boolean('datetime-moved', true);
            updateStatus();
            updateButtonStates();
            this.showToast(window, 'Date/Time moved to left side (after activities)');
        });

        moveExtensionButton.connect('clicked', () => {
            const extensionCentered = this.settings.get_boolean('extension-centered');
            if (extensionCentered) {
                this.showToast(window, 'Extension is already centered');
                return;
            }

            this.settings.set_boolean('extension-centered', true);
            updateStatus();
            updateButtonStates();
            this.showToast(window, 'Extension moved to center');
        });

        restoreButton.connect('clicked', () => {
            const datetimeMoved = this.settings.get_boolean('datetime-moved');
            const extensionCentered = this.settings.get_boolean('extension-centered');

            if (!datetimeMoved && !extensionCentered) {
                this.showToast(window, 'Layout is already in default state');
                return;
            }

            this.settings.set_boolean('datetime-moved', false);
            this.settings.set_boolean('extension-centered', false);
            updateStatus();
            updateButtonStates();
            this.showToast(window, 'Layout restored to default');
        });

        // 监听设置变化
        this.settings.connect('changed::datetime-moved', () => {
            updateButtonStates();
            updateStatus();
        });

        this.settings.connect('changed::extension-centered', () => {
            updateButtonStates();
            updateStatus();
        });

        // 初始状态更新
        updateStatus();
        updateButtonStates();

        layoutGroup.add(layoutContainer);
    }

    // 显示Toast消息
    showToast(window, message) {
        const toast = new Adw.Toast({
            title: message,
            timeout: 2
        });

        window.add_toast(toast);
    }
}
