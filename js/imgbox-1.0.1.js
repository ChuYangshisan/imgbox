/**
 * 点击缩略图放大缩小
 *
 *
 * 使用说明:
 *
 * <img src="小图url" large-src="大图url"  />
 * or:
 * <img src="小图url"  />
 * or:
 * <img src="小图url" large-src="大图url"/>
 *
 * 支持两种使用模式:
 *   1. 标签选择器调用, 1. $('xx').imgbox() or 2. $('xx').imgbox(settings);
 *   2. ImgBox.imgbox(img [,settings])包装img选择器或Image对象
 *
 *
 *
 * -v1.0.1-
 * 2018-7-23 13:14:35
 *
 * @author Nisus Liu
 * @date 2018-5-3 21:42:21
 * @requires jQuery 1.12+
 * @version 1.0.1
 * */
(function (global, jQuery, factory) {

    if (typeof module === "object" && typeof module.exports === "object") {
        // For CommonJS and CommonJS-like environments where a proper window is present,
        // execute the factory and get jQuery
        // For environments that do not inherently posses a window with a document
        // (such as Node.js), expose a jQuery-making factory as module.exports
        // This accentuates the need for the creation of a real window
        // e.g. var jQuery = require("jquery")(window);
        // See ticket #14549 for more info
        module.exports = factory(global, jQuery);
    } else {
        factory(global, jQuery);
    }

// Pass this if window is not defined yet
}(typeof window !== 'undefined' ? window : this, typeof jQuery !== "undefined" ? jQuery : this, function (window, $) {

    //构建ImgBox实例时的配置
    var defaultOptions = {
        magnification: 1,            //默认放大倍数
        max: 5,                       //最大倍数
        min: 0.5                      //最小倍数
        //width:                    //自定义了宽(高)则 magnification 针对宽(高)失效
        //height:
    };

    function ImgBox() {
        this.origins = [],
            //当前被激活的Origin对象, i.e.其大图被处于预览状态
            this.activeOrigin = null;
        //大图片显示框
        // this.$zoomArea = $('<div class="__max_div__"><div class="__close_button__" title="点击关闭" onclick="hideMax()"><img src="img/delete.png"></div></div>');
        //存放放大图片的区域容器
        this.$zoomArea = $('<div class="imgbox-area" style="display: none;"></div>');
        this.$toolbarDom = $('<div class="imgbox-toolbar"><ul>' +
            '<li class="btn-rotate rotate-left"></li>' +
            '<li class="btn-rotate rotate-right"></li></ul></div>');
        this.$titleDom = $('<div class="imgbox-item-title"></div>');


        this.$zoomArea.append(this.$titleDom).append(this.$toolbarDom);

        //遮罩层
        this.$cover = $('<div class="imgbox-cover" style="display: none;"></div>');

        //定义旋转方法
        this.rotate = function (e) {
            //调用Origin自己的rotate方法
            this.activeOrigin.rotate(e.data);
        }.bind(this);

    }

    //全局对象, 暴露给外部使用的
    var ImgBox = window.ImgBox = new ImgBox();


    ImgBox.$cover.bind('click', function () {
        ImgBox.hideMax();
    });


    //将大图容器和遮罩层添加至body中
    $(document).ready(function () {
        $('body').append(ImgBox.$cover).append(ImgBox.$zoomArea);
        //绑定事件
        ImgBox.$zoomArea.find('.rotate-left').bind('click', 'left', ImgBox.rotate);
        ImgBox.$zoomArea.find('.rotate-right').bind('click', 'right', ImgBox.rotate);

    });


    var _enter = false;         //标识鼠标是否在大图上


    //构造函数
    var Origin = ImgBox.Origin = function (imgTag) {
        this.$self = $(imgTag);
        //img标签或者dom,jq对象, 统一转成jq对象, i.e.原始图片所在的容器
        this.smallImage = this.$self[0];

        //默认配置
        this.options = defaultOptions;


        //大图片box, 拖拽, 放大缩小, 其他按钮(其他按钮若是公用的则放到zoomArea中, 私有的则放到这里)
        this.$largeBox = $('<div class="imgbox-item"></div>');
        //预图片项的标题
        this.title = this.$self.attr('title');
        if (!this.title) this.title = '';
        //this.$title = $('<div class="imgbox-item-title">' + title + '</div>');
        this.$largeBox.append(this.$title);
        this.largeImage = new Image();
        this.$largeBox.append(this.largeImage);
        if (this.$self.attr('large-src')) {
            this.$largeBox.find('img').attr('src', this.$self.attr('large-src'));
        }


        // this.closeButton = $('<div class="__close_button__" title="点击关闭" onclick="hideMax()"><img src="img/delete.png"></div>')

        //大图配置
        this.configLargeBox();

        this.degree = 0;
        this.rotate = function (direction) {
            if (direction == 'left') {
                this.degree -= 90;
            }
            if (direction == 'right') {
                this.degree += 90;
            }
            //样式
            this.$largeBox.css('transform', 'rotate(' + this.degree + 'deg)');

        };
        //判断当前坐标轴是否应该翻转: 图片旋转造成定位时宽高应该适当翻转
        this.isInverseAxis = function () {
            return Math.abs(this.degree) / 90 % 2 != 0;
        };
        //清除旋转 ==> 角度置为0, 样式置为0deg
        this.cleanRotate = function () {
            this.degree = 0;
            this.rotate();
        }

        //配置大图box
        this.configLargeBox = function () {
            var _this = this;

            //大图url没有设置, 则沿用小图url
            var hasMaxUrl = true;  //是否有大图链接
            if (_this.largeImage.src == null || _this.largeImage.src == '') {
                _this.largeImage.src = _this.smallImage.src;
                hasMaxUrl = false;
            }

            $(_this.largeImage).addClass("imgbox-large-image");

            //宽高处理  没有定制则显示原始尺寸
            //有大图链接, 则以大图尺寸为基准, 没有则以小图为基准
            if (_this.options.width != null) {      //有限使用指定width
                //大图的初始width, 下文缩放以此为基准
                _this.largeImage.baseWidth = _this.options.width * _this.options.magnification;
                $(_this.largeImage).css({'width': _this.largeImage.baseWidth});
            } else if (!hasMaxUrl) {                //没有指定width, 也没有大图, 则显示缩略图原始尺寸
                _this.largeImage.baseWidth = _this.smallImage.naturalWidth * _this.options.magnification;   //若要以小图的css样式则用width取值
                //获取真实尺寸, 然后放大
                $(_this.largeImage).css({'width': _this.largeImage.baseWidth});        //否则在原尺寸扩大的基础上扩大
            } else {
                //没有指定宽度, 但有大图链接, 则使用大图的原始尺寸, i.e. 图片真实尺寸
                _this.largeImage.baseWidth = _this.largeImage.naturalWidth * _this.options.magnification;
                $(_this.largeImage).width(_this.largeImage.baseWidth);
            }
            if (_this.options.height != null) {
                _this.largeImage.baseHeight = _this.options.height * _this.options.magnification;
                $(_this.largeImage).css({"height": _this.largeImage.baseHeight});
            } else if (!hasMaxUrl) {
                _this.largeImage.baseHeight = _this.smallImage.naturalHeight * _this.options.magnification;
                $(_this.largeImage).css({"height": _this.largeImage.baseHeight});
            } else {
                _this.largeImage.baseHeight = _this.largeImage.naturalHeight * _this.options.magnification;
                $(_this.largeImage).height(_this.largeImage.baseHeight);
            }

            //清除旋转
            _this.cleanRotate();

            //配置鼠标事件
            _this.largeImage.onmouseover = function () {
                _enter = true;
            };
            _this.largeImage.onmouseout = function () {
                _enter = false;
            };


            //居中显示
            //大图居中
            _centerize(_this);


            //拖拽事件
            _dragFunc(_this.$largeBox);


            return _this.$largeBox;
        };

    };


    /**img标签选择器调用此方法可将其转换成带有放大功能
     * 1. $('img').imgbox()
     * 2. $('img').imgbox(settings)
     * @param {Object} settings 配置对象, 可选.*/
    $.fn.imgbox = function (settings) {
        ImgBox.imgbox(this, settings);
    };


    /**
     * 将普通img标签选择器或img对象包装成可以实现放大效果的
     * @param {Object} imgSelector Image对象或img标签选择器, 必选. #id .class div ...
     * @param {Object} settings 配置参数, 可选*/
    ImgBox.imgbox = function (imgSelector, settings) {


        //region 入参处理
        if (arguments.length > 2) {
            throw TypeError("参数个数不能大于2");
        }


        //判断第一个参数是对象还是一个选择器
        // if (arguments.length == 1 && $(settings).selector!=null && $(settings).selector.length>0) {
        //     //说明没有输入 settings 参数
        //     imgSelector = $(settings);
        //     settings = null;
        // }


        // var _this;
        // if (imgSelector !== undefined) {
        //     //正在使用ImgBox包装模式
        //     _this = imgSelector;
        // }else{
        //     //正在使用图片选择器调用此方法
        //     _this = this;
        // }
        //endregion

        //构造 Origin
        var origin = new Origin(imgSelector);


        //合并配置, 放入 options中
        if (settings !== undefined) {
            $.extend(origin.options, settings);

        }

        //原始图片标签(小图)
        //validateImgBoxOrigin()  //校验HTML标签是否符合本插件要求的规范格式


        origin.$self.unbind('click').bind('click', function () {
            //绑定点击事件
            //点击放大
            ImgBox.showMax(origin);
        });


        //添加滚轮事件
        _addWheelListener();


        //添加至 ImbBox
        ImgBox.origins.push(origin);
        return ImgBox;
    };


    function _centerize(origin) {
        var $box = origin.$largeBox;
        var $img = $(origin.largeImage);
        var ow, oh;
        ow = $img.outerWidth();
        oh = $img.outerHeight();


        $box.css({
            position: "absolute",
            // 'margin-left': -box.width / 2,                  //图片宽度的一般(负值)    ($(window).width() - $(_this.largeImage).outerWidth()) / 2,
            // 'margin-top': -box.height / 2,                   //($(window).height() - $(_this.largeImage).outerHeight()) / 2
            // top: '50%',
            // left: '50%'
            left: ($(window).width() - ow) / 2,
            top: ($(window).height() - oh) / 2
        });
    }

    /**由区域中心向四周放大, 或向中心收缩
     * Note: 浏览器会自动帮我们处理旋转之后的宽高差*/
    function _radiusScroll(origin, size) {  //size:[oldWidth,oldHeight,newWight,newHeight]
        console.log(size);
        console.log('old w/h', size[0] / size[1]);
        console.log('new w/h', size[2] / size[3]);
        var $box = origin.$largeBox;
        var dleft, dtop;
        var oldleft_css = parseInt($box.css('left'));
        var oldtop_css = parseInt($box.css('top'));

        //不用自己处理翻转坐标后的宽高差
        dleft = (size[2] - size[0]) / 2;
        dtop = (size[3] - size[1]) / 2;
        var left = oldleft_css - dleft;       //position().left 获取的是数值
        var top = oldtop_css - dtop;

        console.log('new left', left);
        console.log('new top', top);
        $box.css({
            left: left + 'px',
            top: top + 'px'
        });
    }


    Origin.prototype.configLargeBox =
        ImgBox.showMax = function (origin) {
            var _this = this;
            if (origin == null) return;
            //判断是否更换了origin
            if (_this.activeOrigin != origin) {
                //移除旧的
                //$(origin.largeImage).remove();
                //$(origin.$zoomArea).remove();
                if (_this.activeOrigin != null) _this.activeOrigin.$largeBox.remove();

                //更新大图对象的配置     Mod: 每个Origin的大图有它自己的配置信息, 并且切换Origin后, 依然保留在
                origin.configLargeBox();

                //更新大图div中image
                _this.$zoomArea.append(origin.$largeBox);
                //更新标题
                _this.$titleDom.text(origin.title);
                //甩开图片(图片们有更新, 才需要执行)
                ImgBox.throwOffImg();
            }

            //显示遮罩层
            _this.$cover.show();
            //document.body.appendChild(_this.$cover[0]);
            //显示maxDiv
            _this.$zoomArea.show();

            //更新当前正在显示大图的 origin
            _this.activeOrigin = origin;

        };

    //!解决鼠标松开后, 图片还跟着鼠标走!
    //禁止拖动页面图片在新窗口打开
    ImgBox.throwOffImg = function () {
        for (i in document.images) document.images[i].ondragstart = function () {
            return false;
        }
    };


    //隐藏大图
    ImgBox.hideMax = function () {        //页面元素 onclick属性要调用
        ImgBox.$zoomArea.hide();    //暂时只是隐藏, 当换origin时再empty
        ImgBox.$cover.hide();     //遮罩层隐藏起来
    };


    //鼠标滚轮放大缩小
    var _addWheelListener = function () {

        if (document.addEventListener) {
            //webkit
            document.addEventListener('mousewheel', _scrollFunc, false);
            //firefox
            document.addEventListener('DOMMouseScroll', _scrollFunc, false);

        } else if (window.attachEvent) {//IE
            document.attachEvent('onmousewheel', _scrollFunc);
        }


    };


    //滚轮放大缩小
    var _scrollFunc = function (e) {
        e = e || window.event;

        if (_enter) {
            if (e && e.preventDefault) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                e.returnvalue = false;
            }
        } else {
            return;
        }


        var w = parseInt(ImgBox.activeOrigin.largeImage.width);
        var h = parseInt(ImgBox.activeOrigin.largeImage.height);
        var r = w / ImgBox.activeOrigin.largeImage.baseWidth;
        //宽高比
        //var aspectRatio = h / w;


        function zoomOut(origin, w, h, r) {
            if (r >= origin.options.max) return;
            //每滚一下增加10/%        保持纵横比
            $(origin.largeImage).css({
                "width": (w * 1.1) + "px",
                "height": (h * 1.1) + "px"
            });
        }

        function zoomIn(origin, w, h, r) {
            if (r <= origin.options.min) return;
            $(origin.largeImage).css({
                "width": (w * 0.9) + "px",
                "height": (h * 0.9) + "px"
            });
        }

        if (e.wheelDelta && _enter) {  //判断浏览器IE，谷歌滑轮事件
            if (e.wheelDelta > 0) { //当滑轮向上滚动时
                zoomOut(ImgBox.activeOrigin, w, h, r);

                // console.log('naturalWidth',ImgBox.activeOrigin.largeImage.naturalWidth);
                // console.log('naturalHeight',ImgBox.activeOrigin.largeImage.naturalHeight);
                // console.log("css width",$(ImgBox.activeOrigin.largeImage).css('width'));
                // console.log("width()", $(ImgBox.activeOrigin.largeImage).width());
                // console.log("width", ImgBox.activeOrigin.largeImage.width);
                // ImgBox.$zoomArea.find('.__close_button__').css("margin-left",(w-125)<125?125:(w-125)+"px");
            }
            if (e.wheelDelta < 0) { //当滑轮向下滚动时
                zoomIn(ImgBox.activeOrigin, w, h, r);
            }
        } else if (e.detail && _enter) {  //Firefox滑轮事件
            if (e.detail > 0) { //当滑轮向下滚动时
                zoomIn(ImgBox.activeOrigin, w, h, r);
            }
            if (e.detail < 0) { //当滑轮向上滚动时
                zoomOut(ImgBox.activeOrigin, w, h, r);
            }
        }

        //居中显示
        //大图居中
        _radiusScroll(ImgBox.activeOrigin, [w, h, ImgBox.activeOrigin.largeImage.width, ImgBox.activeOrigin.largeImage.height]);


    }; //给页面绑定滑轮滚动事件


    //拖动事件
    /**
     *
     * @param target 要拖动的对象
     * @private
     */
    var _dragFunc = function (target) {
        var _move = false;//移动标记
        var _x, _y;//鼠标离控件左上角的相对位置
        var wd;//窗口
        target.click(function () {
            //alert("click");//点击（松开后触发）
            //this.style.cursor = "default";//鼠标形状
            //this.style.zIndex = 999;
            console.log('click this:', this);
        }).mousedown(function (e) {
            _move = true;
            wd = $(this);

            //this.style.cursor = "move";//鼠标形状
            // this.style.zIndex = _z;//窗口层次
            // _z++;
            _x = e.pageX - (isNaN(parseInt(wd.css("left"))) ? 0 : parseInt(wd.css("left")));
            _y = e.pageY - (isNaN(parseInt(wd.css("top"))) ? 0 : parseInt(wd.css("top")));

            //关闭按钮位置更新
            // c_x=e.pageX-(isNaN(parseInt(close.css("left")))?0:parseInt(close.css("left")));
            // c_y=e.pageY-(isNaN(parseInt(close.css("top")))?0:parseInt(close.css("top")));

            /*  wd.fadeTo(20, 0.25); *///点击后开始拖动并透明显示
            $(document).mousemove(function (e) {
                if (_move) {
                    var x = e.pageX - _x;//移动时根据鼠标位置计算控件左上角的绝对位置
                    var y = e.pageY - _y;

                    // var closeX=e.pageX-c_x;
                    // var closeY=e.pageY-c_y;
                    wd.css({top: y, left: x});//控件新位置
                    // close.css({top:closeY,left:closeX});
                }
            }).mouseup(function () {
                _move = false;
                wd.fadeTo("fast", 1); //松开鼠标后停止移动并恢复成不透明
            });
        });
    };


    return ImgBox;

}));  // () 定义函数立即执行