// https://rawgit.com/SergeyA/rsdn-mobile-view/master/rsdn-mobile-view.js
(function () {

    if (!isMobileBrowser())
        return;

    if (window.jQuery) {
        $(process);
    }

    function process() {

        var href = window.location.href;

        if (href.indexOf("/frames/mainnew") >= 0 && href.indexOf("/toc") < 0) {
            processHomePage();
            return;
        }

        if (getCookie("mobileView") != "1")
            return;

        addGaTracker();

        if (href.indexOf("/forum/list") >= 0) {
            processForumsList();
            return;
        }

        if (href.indexOf("MsgList.aspx") >= 0) {
            processTopicsList();
            return;
        }

        if (href.indexOf("NewMsg.aspx") >= 0) {
            processMsgEdit();
            return;
        }

        if (href.indexOf(".flat") >= 0 || href.indexOf(".hot") >= 0 || href.indexOf(".all") >= 0) {
            processPostsList();
            return;
        }

        // Перенаправление на плоский вид страницы просмотра топика /forum/flame.comp/nnnnn => /forum/flame.comp/nnnnn.flat
        var topicNoFlat = /\/forum\/(.*)\/(\d+)$/
        if (topicNoFlat.exec(href)) { 
            var flatHref = href + ".flat";
            console.debug("Redirect to topic flat view " + flatHref);
            window.location = flatHref;
        }
    }

    function processHomePage() {
        $("body").prepend($("<div class='mobile-view-suggestion' style='padding: 10px; background: #eee; font-size: 25px'>Перейти на мобильную версию сайта? </div>")
            .append($("<button style='min-width: 100px; font-size: 25px; margin-right: 20px;'>Да</button>").on("click", turnOnMobileView))
            .append($("<button style='min-width: 100px; font-size: 25px'>Нет</button>").on("click", turnOffMobileView))
        );

        function turnOnMobileView() {
            setCookie("mobileView", "1", new Date(2100, 0, 1).toUTCString(), "/");
            window.top.location.pathname = "/forum/list";
        }

        function turnOffMobileView() {
            setCookie("mobileView", "0", new Date(2100, 0, 1).toUTCString(), "/");
            $(".mobile-view-suggestion").remove();
        }
    }

    function processForumsList() {
        $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1"/>');

        $('header, footer').remove();

        $('main.main').css({ padding: 0, "min-width": 0 });

        $("table.forum-group").find("td, th").not(":first-child").remove();

        $("table.forum-group div.forum-name a").each(function () {
            var group = $(this).attr("href").split(/\//).pop();
            $(this).attr("href", "/Forum/MsgList.aspx?flat=1&group=" + trim(group));
        });
    }

    function processTopicsList() {

        var href = window.location.href;

        var forum = getHrefParam(href, "forum");
        var mid = getHrefParam(href, "mid");
        if (mid && forum) {
            // Переключаемся на страницу просмотра конкретной темы. 
            // При навигации на конкретную тему с главной страницы в иерерхическом режиме, открывается список тем, а не конкретная тема
            // см. http://rsdn.org/forum/rsdn/7774236.1
            href = "/forum/" + forum + "/" + mid + ".flat";
        } else {
            // Переключаемся на "плоский" список тем
            href = setHrefParam(href, "flat", "1");
        }

        if (inFrame()) {
            console.debug("Redirect parent frame to " + href);
            window.top.location = href;
            return;
        }

        if (window.location.href != href) {
            console.debug("Redirect to " + href);
            window.location = href;
            return;
        }

        $('head').append('<meta name="viewport" content="width=device-width, initial-scale=1"/>');
        $("head").append("<link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet' type='text/css'>");

        $("#tbl tr").each(function () {
            var $row = $(this);

            if ($row.is(":first-child"))
                renderHeaderRow($row);
            else if ($row.is(":last-child"))
                renderFooterRow($row);
            else
                renderTopicRow($row);

            $row.find("td")
                .css("line-height", "normal")
                .css("white-space", "normal")
                .css("font-family", "Roboto");
        });

        $(".list-hdr").remove();

        // переверстываем заголовок списка
        function renderHeaderRow($row) {
            $row.find("td").css("display", "none");

            var forumName = $row.closest("form").find(".list-hdr b").text();

            var $srcCell = $row.parent().find("tr:last-child td:nth-child(1)");

            var iconNew = getIconElm($srcCell, "new", "20px");

            var $inner = $("<div style='font-weight: bold; font-size: 15px;'></div>")
                .append($("<div style='float: left; width: 90%; text-align: center;'/>").append(forumName))
                .append($("<div style='float: right;'/>").append(iconNew))
                .append($("<div style='clear: both;'/>"));

            var content = $("<td style='padding: 10px 8px;'/>")
                .append($inner);

            $row.css("background-color", "#d4f7d4");

            $row.prepend(content);
        }

        // переверстываем футер списка
        function renderFooterRow($row) {
            $row.find("td").css("display", "none");

            var $srcCell = $row.find("td:nth-child(1)");

            var navigatePrev = getIconElm($srcCell, "prev", "20px");
            var navigateNext = getIconElm($srcCell, "next", "20px");
            var total = navigatePrev[0].nextSibling.nodeValue;
            var refresh = getIconElm($srcCell, "refresh", "20px");

            var $inner = $("<div style='font-size: 15px;'></div>")
                .append($("<span style='float: left;'/>").append(navigatePrev).append(total).append(navigateNext))
                .append($("<span style='float: right;'/>").append(refresh))
                .append($("<div style='clear: both;'/>"));

            var content = $("<td style='padding: 10px 8px;'/>")
                .append($inner);

            $row.prepend(content);
        }

        // переверстываем строку с темой обсуждения
        function renderTopicRow($row) {

            var signs = {
                star: "&#9733;",
                starOutlined: "&#9734;",
                heart: "&#10084;"
            };

            $row.find("td").css("display", "none");

            function cellText(num) {
                return $row.find("td:nth-child(" + num + ")").text();
            }

            var rating = trim(cellText(4));
            if (rating == "+/-") {
                rating = "(" + rating + ")";
            } else if (rating) {
                rating = "(" + rating + " " + signs.starOutlined + ")";
            }

            var $row1 = $("<div style='color: #777; font-size: 13px;'></div>")
                .append($("<span style='float: left;'/>").html(cellText(3) + " " + rating)) // author, rating
                .append($("<span style='float: right;'/>").text(cellText(5) + " / " + cellText(6)))     // count, last time
                .append($("<div style='clear: both;'/>"));

            var $row2 = $("<div style='font-weight: bold; margin-top: 5px; font-size: 17px;'></div>").html($row.find("td:nth-child(2)").html());

            var content = $("<td style='padding: 5px 8px;'/>")
                .append($row1)
                .append($row2);

            $row.prepend(content);
        }

        function getIconElm($srcCell, img, height) {
            var $elm = $srcCell.find("img[src*='" + img + "']");

            if (height)
                $elm.css("width", "auto").css("height", height);

            var $a = $elm.parent("a"); // img not wrapped by A tag if navigation disabled
            if ($a.length > 0)
                $elm = $a;

            return $elm;
        }
    }

    function processPostsList() {
        $("head").append('<meta name="viewport" content="width=device-width, initial-scale=1"/>');
        $("head").append("<link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet' type='text/css'>");

        // Удаляем тэги, подписи, визуальный мусор
        $(".msg-hdr .subj, .country-img, .tags-box, div.o.m").remove();

        // Подравниваем заголовок топика
        $(".home-page").attr("rowspan", 1);
        $("tr.rate-row").prev().find("td:nth-child(2)").attr("colspan", 2);

        // Удаляем лишние кнопки с тулбара
        $(".right-tb").find(".add-fav-btn, .search-btn, .show-in-topic-btn, .subs-button, .automod-btn, .report-btn").remove();

        // Настраиваем размер тулбара
        $(".icon").css({ "height": "18px", "width": "18px", "margin": "6px 4px", "display": "block" });
        $(".touch .msg-hdr").css({ height: "30px" });
        $(".rate-btns").css("margin-left", 0);

        // Устраняем последствия класса minimized (возвращаем тулбар на место)
        $(".right-tb").css({ width: "auto", position: "relative", right: "initial", top: "initial", "text-align": "left", "margin-top": 0, "height": "30px" });
        $(".m").css({ "padding-right": "10px" });
        $(".msg-body").css({ "min-height": 0 });

        // Подстраиваем выравнивание цитаты для оптимального использования пространства
        $("blockquote").css({ "margin-right": "10px" });

        // Переключаем шрифт на Roboto
        $("body, div.m, td.i, td.ii").css("font-family", "Roboto,Verdana,Geneva,sans-serif");
    }

		function processMsgEdit() {
			$("head").append('<meta name="viewport" content="width=device-width, initial-scale=1"/>');
			$("head").append("<link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet' type='text/css'>");

			// Настраиваем размер тулбара
			$(".toolbar-row").css({ "height": "auto" });
			$(".toolbar-row td").css({ "height": "auto", "max-height": "115px" });
			//$(".tb-btn").css({ "height": "20px", "min-width": "20px", "font-size": "16px" });

			// Упрощаем поле ввода темы сообщения
			var subj = $("#subj");
			var subjParent = subj.parent();
			
			subj
				.css({ "width": "100%" })	
				.detach();
				
			subjParent.empty();
			subjParent.append(subj);
				
			$("textarea[name='msgEdit']").attr('rows', '15');
			
			// Удаляем поле ввода названия сообщения (экономим место в мобильном интерфейсе)
			$("#messageNameRow").remove();
			
			// Удаляем иконку виртуальной клавиатуры (на мобильных устройствах есть своя экранная клавиатура)
			// Т.к. иконка клавиатуры добавляется уже после загрузки страницы, единственный способ удалить ее - это повесить стиль display:none на селектор
			// $(".keyboardInputInitiator").remove(); - это не работает
			var styleElm = document.createElement('style');
			document.head.appendChild(styleElm);
			var styleSheet = styleElm.sheet;			
			styleSheet.insertRule(".keyboardInputInitiator { display: none }");
			
			// Удаляем комментарий к полю с тэгами (экономим место в мобильном интерфейсе)
			$("#tag-edit").parent().find("small").remove();
			
			// Разносим по строкам нагромождение контролов в нижней части формы
			$("input[name='name'], input[name='pwd']").css("width", "120px");
			$("input[name='preview']").before("<br/><br/>");
			$("a#upload").next("span").css("margin-left", "0");
			$("a#upload").after("<br/><br/>");
			$("input#nosmile").before("<br/>");
			
			// Удаляем кнопки для проверки правописания (экономим место в мобильном интерфейсе)
			$("button[name='cmdSpell']").closest('tr').remove();
			
			// Переключаем шрифт на Roboto
			$("body, div.m, td.i, td.ii, textarea").css("font-family", "Roboto,Verdana,Geneva,sans-serif");
		}
		
    // utils

    function isMobileBrowser() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    function inFrame() {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    function trim(str) {
        return $('<div/>').html(str).text(); // отрезаем пробелы, включая &nbsp;
    }

    function setHrefParam(href, param, value) {
        var found = false;
        var paramsCount = 0;

        var href = href
            .split("?")
            .map(function (val, idx) {
                if (idx == 1)
                    return val
                        .split("&")
                        .map(function (q) {
                            paramsCount++;

                            if (q.indexOf(param + "=") == 0) {
                                found = true;
                                return param + "=" + value;
                            } else
                                return q;
                        })
                        .join("&");
                else
                    return val;
            })
            .join("?");

        if (!found) {
            if (paramsCount == 0)
                href = href + "?";
            else
                href = href + "&";

            href = href + param + "=" + value;
        }

        return href;
    }

    function getHrefParam(href, param) {
        
        var parts = href.split("?");
        
        if (parts.length < 2)
            return "";
        
        return parts[1]
            .split("&")
            .map(p=> p.split("="))
            .filter(p => p.length > 1 && p[0] == param)
            .map(p => p[1])[0] ?? "";
    }

    function setCookie(name, value, expires, path, domain, secure) {
        document.cookie = name + "=" + escape(value) +
            ((expires) ? "; expires=" + expires : "") +
            ((path) ? "; path=" + path : "") +
            ((domain) ? "; domain=" + domain : "") +
            ((secure) ? "; secure" : "");
    }

    function getCookie(name) {
        var cookie = " " + document.cookie;
        var search = " " + name + "=";
        var setStr = null;
        var offset = 0;
        var end = 0;
        if (cookie.length > 0) {
            offset = cookie.indexOf(search);
            if (offset != -1) {
                offset += search.length;
                end = cookie.indexOf(";", offset)
                if (end == -1) {
                    end = cookie.length;
                }
                setStr = unescape(cookie.substring(offset, end));
            }
        }
        return (setStr);
    }

    function addGaTracker() {

        var gaCode = " \
            window.dataLayer = window.dataLayer || []; \
            function gtag(){dataLayer.push(arguments);} \
            gtag('js', new Date()); \
            gtag('config', 'UA-1775885-10');";

        $("<script async src='https://www.googletagmanager.com/gtag/js?id=UA-1775885-10'></script>").appendTo("head");

        $('<script>').attr('type', 'text/javascript').text(gaCode).appendTo('head');
    }

})();
