/**
 * 点击缩略图放大缩小
 *
 *
 * 使用说明:
 *
 * <img src="小图url" imgbox--max-src="大图url"  />
 * or:
 * <img src="小图url"  />
 *
 * 支持两种使用模式:
 *   1. 标签选择器调用, 1. $('xx').imgbox() or 1. $('xx').imgbox(settings);
 *   2. ImgBox.imgbox(img [,settings])包装img选择器或Image对象
 *
 * TODO 滚动放大缩小时, 图片位置会跳到中间, 不论当前图片被拖动到了哪里
 *
 * @author Nisus Liu
 * @since 2018-5-3 21:42:21
 * @requires jQuery 1.12+
 * @version 1.0.0
 * */
var ImgBox = (function invocation($) {
    //全局对象, 暴露给外部使用的
    var ImgBox = {
        origins : []
    };


    var _enter = false;         //标识鼠标是否在大图上



    //构造函数
    var Origin = ImgBox.Origin = function(miniImg) {
        this.origin = $(miniImg);
        var img = new Image();
        img.src = $(miniImg).attr('src');


        this.origin.img = img;


        //默认配置
        this.options = {
            magnification: 1             //默认放大倍数
            //width:                    //自定义了宽(高)则 magnification 针对宽(高)失效
            //height:
        };


        //大图片显示框
        // this.maxDiv = $('<div class="__max_div__"><div class="__close_button__" title="点击关闭" onclick="hideMax()"><img src="img/delete.png"></div></div>');
        this.maxDiv = $('<div class="__max_div__"></div>');     //TODO 增加关闭按钮
        this.cover = $('<div class="__cover__" onclick="hideMax()" style="display: block;"></div>');

        //大图片
        this.maxImage = new Image();
        if($(miniImg).attr('imgbox-max-src')) {
            this.maxImage.src = $(miniImg).attr('imgbox-max-src');
        }



        // this.closeButton = $('<div class="__close_button__" title="点击关闭" onclick="hideMax()"><img src="img/delete.png"></div>')
    }


    /**img标签选择器调用此方法可将其转换成带有放大功能
     * 1. $('img').imgbox()
     * 2. $('img').imgbox(settings)
     * @param {Object} settings 配置对象, 可选.*/
    $.fn.imgbox = function (settings) {
        ImgBox.imgbox(this, settings);
    };



    /**
     * 将普通img标签选择器或img对象包装成可以实现放大效果的
     * @param {Object} imgSelector Image对象或img标签选择器, 必选
     * @param {Object} settings 配置参数, 可选*/
    ImgBox.imgbox = function (imgSelector,settings) {


        //region 入参处理
        if (arguments.length > 2) {
            throw TypeError("参数个数大于2");
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
        if(settings!==undefined) {
        $.extend(origin.options, settings);

        }

        //原始图片标签(小图)
        //validateImgBoxOrigin()  //校验HTML标签是否符合本插件要求的规范格式



        $(origin.origin).unbind('click').bind('click', function () {
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


    function _centerizeImage(image) {
        $(image).css({
            position: "absolute",
            // 'margin-left': -image.width / 2,                  //图片宽度的一般(负值)    ($(window).width() - $(_this.maxImage).outerWidth()) / 2,
            // 'margin-top': -image.height / 2,                   //($(window).height() - $(_this.maxImage).outerHeight()) / 2
            // top: '50%',
            // left: '50%'
            left: ($(window).width() - $(image).outerWidth())/2,
            top: ($(window).height() - $(image).outerHeight())/2
    });
    }


    // function _centerizeImage(image) {
    //
    // }



    function _configMaxImage() {
        var _this = this;

        var src = $(_this.origin).attr('src');
        var maxsrc = $(_this.origin).attr('imgbox-max-src');

        //大图url没有设置, 则沿用小图url
        var hasMaxUrl = true;  //是否有大图链接
        if (maxsrc == null) {
            maxsrc = src;
            hasMaxUrl = false;
        }


        _this.maxImage.src = maxsrc;
        _this.maxImage.setAttribute("class", "__max_image__");

        //宽高处理  没有定制则显示原始尺寸
        //有大图链接, 则以大图尺寸为基准, 没有则以小图为基准
        if (_this.options.width != null) {
            $(_this.maxImage).css({'width':_this.options.width * _this.options.magnification});
        } else if (!hasMaxUrl) {
            //获取真实尺寸, 然后放大
            $(_this.maxImage).css({'width':_this.origin.img.width * _this.options.magnification});        //否则在原尺寸扩大的基础上扩大
        } else {
            //没有指定宽度, 或, 有大图链接, 则使用默认尺寸, i.e. 图片真实尺寸
            $(_this.maxImage).width(_this.maxImage.width);
        }
        if (_this.options.height != null) {
            $(_this.maxImage).css({"height":_this.options.height * _this.options.magnification}) ;
        } else if (!hasMaxUrl) {
            $(_this.maxImage).css({"height":_this.origin.img.height * _this.options.magnification});
        } else {
            $(_this.maxImage).height(_this.maxImage.height);
        }

        //配置鼠标事件
        _this.maxImage.onmouseover = function () {
            _enter = true;
        };
        _this.maxImage.onmouseout = function () {
            _enter = false;
        };


        //居中显示
        //大图居中
        _centerizeImage(_this.maxImage);


        //拖拽事件
        _dragFunc(_this.maxImage);


        return _this.maxImage;
    }




    /*放大原始图片  i.e. 加载imgbox-max标签指定的大图
    * 若大图url==小图url -> 不重新加载, 接着用已有的*/
    ImgBox.showMax = function (origin) {
        //alert($(origin.origin).attr('src'));
        //移除旧的
        $(origin.maxImage).remove();
        $(origin.maxDiv).remove();

        //更新大图对象的配置
        _configMaxImage.call(origin);

        //显示遮罩层
        origin.cover.show();

        //显示大图div

        // $('.__max_div__').remove();


        origin.maxDiv.append(origin.maxImage);
        //显示遮罩层
        document.body.appendChild(origin.cover[0]);
        document.body.appendChild(origin.maxDiv[0]);




        //更新当前正在显示那个 origin 的大图
        this.activeOrigin = origin;


        //!解决鼠标松开后, 图片还跟着鼠标走!
        //禁止拖动页面图片在新窗口打开
        function imgdragstart() {
            return false;
        }

        for (i in document.images) document.images[i].ondragstart = imgdragstart;

    };


    //隐藏大图
    window.hideMax = ImgBox.hideMax = function () {        //页面元素 onclick属性要调用
        $(".__max_div__").remove();
        $(".__cover__").hide();     //遮罩层隐藏起来
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
        }else{
            return;
        }


        var w = parseInt(ImgBox.activeOrigin.maxImage.width);
        var h = parseInt(ImgBox.activeOrigin.maxImage.height);
        //综合鼻
        var aspectRatio = h / w;


        if (e.wheelDelta && _enter) {  //判断浏览器IE，谷歌滑轮事件
            if (e.wheelDelta > 0) { //当滑轮向上滚动时
                // $(ImgBox.activeOrigin.maxImage).css({"width":w+Number(28)+"px","height":h+Number(50)+"px"});
                // ImgBox.maxDiv.find('.__close_button__').css("margin-left",(w-125)<125?125:(w-125)+"px");

                //没滚一下增加10/%        保持纵横比
                $(ImgBox.activeOrigin.maxImage).css({"width": (w * 1.1) + "px", "height": (w * 1.1 * aspectRatio) + "px"});
                // ImgBox.maxDiv.find('.__close_button__').css("margin-left",(w-125)<125?125:(w-125)+"px");
            }
            if (e.wheelDelta < 0) { //当滑轮向下滚动时
                // $(ImgBox.activeOrigin.maxImage).css({"width":(w-28)<280?280:(w-28)+"px","height":(h-50)<500?500:(h-50)+"px"});
                // ImgBox.maxDiv.find('.__close_button__').css("margin-left",(w-155-28)<125?125:(w-155-28)+"px");
                $(ImgBox.activeOrigin.maxImage).css({"width": (w * 0.9) + "px", "height": (w * 0.9 * aspectRatio) + "px"});

            }
        } else if (e.detail && _enter) {  //Firefox滑轮事件
            if (e.detail > 0) { //当滑轮向下滚动时
                // $(ImgBox.activeOrigin.maxImage).css({"width":(w-28)<280?280:(w-28)+"px","height":(h-50)<500?500:(h-50)+"px"});
                // ImgBox.maxDiv.find('.__close_button__').css("margin-left",(w-155-28)<125?125:(w-155-28)+"px");
                $(ImgBox.activeOrigin.maxImage).css({"width": (w * 0.9) + "px", "height": (w * 0.9 * aspectRatio) + "px"});
            }
            if (e.detail < 0) { //当滑轮向上滚动时
                // $(ImgBox.activeOrigin.maxImage).css({"width":w+Number(28)+"px","height":h+Number(50)+"px"});
                // ImgBox.maxDiv.find('.__close_button__').css("margin-left",(w-125)<125?125:(w-125)+"px");
                $(ImgBox.activeOrigin.maxImage).css({"width": (w * 1.1) + "px", "height": (w * 1.1 * aspectRatio) + "px"});
            }
        }

        //居中显示
        //大图居中
        _centerizeImage(ImgBox.activeOrigin.maxImage);
        // $(_imgBox.maxImage).css({
        //     position: "absolute",
        //     left: ($(window).width() - $(_imgBox.maxImage).outerWidth()) / 2,
        //     top: ($(window).height() - $(_imgBox.maxImage).outerHeight()) / 2
        // });


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
        $(target).click(function () {
            //alert("click");//点击（松开后触发）
            //this.style.cursor = "default";//鼠标形状
            //this.style.zIndex = 999;
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

}($));    // () 定义函数立即执行