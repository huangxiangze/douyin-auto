// 抖音自动化 - AutoX 版本 v4.0
"ui";

var CONFIG_FILE = "/sdcard/douyin_auto_config.json";

var DEFAULT_CONFIG = {
    videoKeywords: "美食,烹饪,教程",
    videoMatchType: "fuzzy",
    likeEnabled: true,
    likeIntervalMin: 3000,
    likeIntervalMax: 8000,
    collectEnabled: false,
    collectIntervalMin: 4000,
    collectIntervalMax: 9000,
    followEnabled: false,
    followIntervalMin: 5000,
    followIntervalMax: 12000,
    directReplyEnabled: false,
    commentFilterEnabled: true,
    commentKeywords: "好看,厉害,666,求教程",
    replyTexts: "太赞了|厉害|学到了",
    autoLiveEnabled: true,
    maxReplyCount: 10
};

var config = {};
var isRunning = false;
var replyCount = 0;
var screenW = device.width;
var screenH = device.height;

function sleep(ms) {
    var start = Date.now();
    while (Date.now() - start < ms) {}
}

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function delay(min, max) {
    sleep(random(min, max));
}

function saveConfig() {
    files.write(CONFIG_FILE, JSON.stringify(config, null, 2));
    toast("配置已保存");
}

function loadConfig() {
    try {
        if (files.exists(CONFIG_FILE)) {
            var loaded = JSON.parse(files.read(CONFIG_FILE));
            for (var key in DEFAULT_CONFIG) {
                if (loaded[key] === undefined) loaded[key] = DEFAULT_CONFIG[key];
            }
            config = loaded;
        } else {
            config = {};
            for (var k in DEFAULT_CONFIG) config[k] = DEFAULT_CONFIG[k];
        }
    } catch (e) {
        config = {};
        for (var k in DEFAULT_CONFIG) config[k] = DEFAULT_CONFIG[k];
    }
}

function parseKeywords(text) {
    if (!text || !text.trim()) return [];
    return text.split(/[,，|]/).map(function(s) { return s.trim(); }).filter(Boolean);
}

function matchKeywords(text, keywords, matchType) {
    if (!text || keywords.length === 0) return false;
    text = text.toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
        var k = keywords[i].toLowerCase();
        if (matchType === "exact") {
            if (text === k) return true;
        } else {
            if (text.indexOf(k) >= 0) return true;
        }
    }
    return false;
}

function getRandomItem(arr) {
    if (!arr || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomReply() {
    var items = parseKeywords(config.replyTexts);
    return getRandomItem(items) || "赞";
}

function swipeToNextVideo() {
    console.log("[滑动] 划到下一条");
    swipe(screenW / 2, screenH * 0.7, screenW / 2, screenH * 0.3, random(300, 500));
    delay(800, 1500);
}

function likeVideo() {
    if (!config.likeEnabled) return;
    console.log("[点赞]");
    click(screenW * 0.92, screenH * 0.55);
    delay(config.likeIntervalMin, config.likeIntervalMax);
}

function collectVideo() {
    if (!config.collectEnabled) return;
    console.log("[收藏]");
    click(screenW * 0.92, screenH * 0.62);
    delay(config.collectIntervalMin, config.collectIntervalMax);
}

function followAuthor() {
    if (!config.followEnabled) return;
    console.log("[关注]");
    click(screenW * 0.15, screenH * 0.3);
    delay(config.followIntervalMin, config.followIntervalMax);
}

function openComments() {
    console.log("[评论] 打开评论区");
    click(screenW * 0.92, screenH * 0.85);
    delay(1500, 2000);
}

function closeComments() {
    back();
    delay(800, 1000);
}

function scrollComments() {
    swipe(screenW / 2, screenH * 0.6, screenW / 2, screenH * 0.2, 300);
    delay(500, 800);
}

function getVideoTitle() {
    var title = "";
    try {
        var titleEl = id("title").findOne(1000);
        if (titleEl) title = titleEl.text();
    } catch (e) {}
    return title;
}

function getCommentTexts() {
    var texts = [];
    try {
        var comments = className("android.widget.TextView").find();
        for (var i = 0; i < comments.length; i++) {
            var t = comments[i].text();
            if (t && t.length > 2 && t.length < 200) texts.push(t);
        }
    } catch (e) {}
    return texts;
}

function videoMatchesKeywords() {
    var keywords = parseKeywords(config.videoKeywords);
    if (keywords.length === 0) return true;
    var allText = getVideoTitle();
    return matchKeywords(allText, keywords, config.videoMatchType);
}

function tryMatchAndReply() {
    var keywords = parseKeywords(config.commentKeywords);
    var texts = getCommentTexts();
    for (var i = 0; i < texts.length; i++) {
        var text = texts[i];
        if (matchKeywords(text, keywords, config.videoMatchType)) {
            click(screenW * 0.5, screenH * 0.55);
            delay(800, 1200);
            click(screenW * 0.85, screenH * 0.5);
            delay(600, 1000);
            setText(getRandomReply());
            delay(500, 800);
            click(screenW * 0.88, screenH * 0.9);
            console.log("[回复] 已回复");
            delay(3000, 8000);
            back();
            delay(500, 800);
            return true;
        }
    }
    return false;
}

function goToLive() {
    console.log("[直播] 切换直播");
    click(screenW * 0.5, screenH * 0.96);
    delay(2000, 3000);
}

function watchLive() {
    var duration = random(60000, 120000);
    console.log("[直播] 观看 " + Math.round(duration / 1000) + " 秒");
    sleep(duration);
    back();
    delay(1000, 1500);
}

function mainLoop() {
    if (!isRunning) return;
    swipeToNextVideo();
    if (!videoMatchesKeywords()) {
        console.log("[跳过] 不匹配关键词");
        setTimeout(mainLoop, random(300, 600));
        return;
    }
    console.log("[匹配] 开始养号");
    if (config.likeEnabled) likeVideo();
    if (config.collectEnabled) collectVideo();
    if (config.followEnabled) followAuthor();
    if (config.commentFilterEnabled) {
        openComments();
        var scrollCount = 0;
        while (isRunning && scrollCount < 5) {
            if (config.autoLiveEnabled && replyCount >= config.maxReplyCount) {
                closeComments();
                goToLive();
                watchLive();
                replyCount = 0;
                openComments();
            }
            if (tryMatchAndReply()) {
                replyCount++;
                console.log("[回复] " + replyCount + "/" + config.maxReplyCount);
            }
            scrollComments();
            scrollCount++;
        }
        closeComments();
    }
    if (isRunning) setTimeout(mainLoop, random(1000, 2000));
}

function start() {
    if (isRunning) return;
    isRunning = true;
    replyCount = 0;
    toast("启动");
    mainLoop();
}

function stop() {
    isRunning = false;
    toast("停止");
}

ui.layout(
    <vertical padding="16">
        <text text="抖音自动化 v4.0" textSize="24sp" textStyle="bold" textColor="#333333" gravity="center"/>
        <text text="AutoX 版本" textSize="14sp" textColor="#888888" gravity="center" margin="0,0,0,20"/>
        <button id="btnStart" text="启动" w="*" h="60" bg="#4CAF50" textColor="#ffffff" textSize="18sp"/>
        <button id="btnStop" text="停止" w="*" h="60" bg="#f44336" textColor="#ffffff" textSize="18sp" margin="0,10,0,0"/>
        <button id="btnSettings" text="设置" w="*" h="60" bg="#2196F3" textColor="#ffffff" textSize="18sp" margin="0,10,0,0"/>
        <text text="日志:" textSize="16sp" textColor="#333333" margin="0,20,0,5"/>
        <ScrollView w="*" h="200" bg="#f5f5f5">
            <vertical><text id="logText" text="等待启动..." textSize="12sp" textColor="#666666"/></vertical>
        </ScrollView>
        <text id="configText" text="" textSize="12sp" textColor="#888888" margin="0,10,0,0"/>
    </vertical>
);

function updateConfigText() {
    var text = "视频: " + config.videoKeywords + " | 评论: " + config.commentKeywords + " | 回复上限: " + config.maxReplyCount;
    ui.configText.setText(text);
}

ui.btnStart.click(function() { start(); });
ui.btnStop.click(function() { stop(); });
ui.btnSettings.click(function() {
    alert("设置", "请在下方修改配置后保存，当前版本暂不支持弹窗设置，请直接修改 config 文件");
});

ui.emitter.on("create", function() {
    loadConfig();
    updateConfigText();
});

console.log = function(msg) {
    var old = ui.logText.getText();
    var lines = old.split("\n");
    if (lines.length > 50) lines = lines.slice(-50);
    lines.push(new Date().toLocaleTimeString() + " " + msg);
    ui.logText.setText(lines.join("\n"));
};

toast("抖音自动化已加载");
