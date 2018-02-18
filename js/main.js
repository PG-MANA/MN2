/*License:See LICENSE.md*/

/*そうだ IE、潰そう*/
/*IEは忘れた。さあ書こう。*/

class ExaminationManager {
    /*セッターゲッターはスネークケース、関数はキャメルケースという*/
    constructor() {
        this.resetStatus();
        this.json = {};
    }

    resetStatus() {
        this.status = {
            no: 1,
            correct: 0,
            good: 0,
            bad: 0,
            exam_id: ""
        };
    }

    saveStatus() {
        localStorage.QuestionManagerStatus = JSON.stringify(this.status);
    }

    restoreStatus() {
        if (localStorage.QuestionManagerStatus) {
            this.status = JSON.parse(localStorage.QuestionManagerStatus);
            this.deleteSaveData();
            return true;
        }
        return false;
    }

    deleteSaveData() {
        delete localStorage.QuestionManagerStatus;
    }

    set config_json(json) {
        this.config = json;
    }

    getConfigByPrefix(p) {
        let cnt = 0;
        let len = this.config.list.length
        while (cnt < len && this.list.config[cnt].prefix != p) cnt++;
        return (cnt == len) ? null : this.config.list[cnt];
    }

    getExamConfig(index) {
        if (index >= this.config.list.length) return null;
        return this.config.list[index]; //Object.assign(this.config[index]);
    }

    get system_info() {
        return {
            name: this.config.name,
            description: this.config.description
        };
    }

    get now_exam_id() {
        return this.status.exam_id;
    }
    set now_exam_id(id) {
        this.status.exam_id = id;
    }

    set question_json(json) {
        this.json = json;
    }

    get next_question() {
        return (this.json.length > this.status.no) ? this.json[this.status.no++] : null;
    }

    get correct() {
        return this.status.correct;
    }

    set correct(c) {
        this.status.correct = c;
    }

    addRecord(b) {
        if (b) this.status.good++;
        else this.status.bad++;
    }

    get record() {
        return {
            good: this.status.good,
            bad: this.status.bad
        };
    }
}

var log; /*initにおいて初期化*/
var exam_manager = new ExaminationManager();

/*初期化*/
function init() {
    log = localStorage.log !== undefined ? JSON.parse(localStorage.log) : {};
    fetch("config.json").then(response => {
        response.json().then(json => {
            exam_manager.config_json = json;
            setSystemInfo();
            setExamList();
        });
    }).catch(e => {
        alert("設定ファイルの取得に失敗しました。");
        console.log(e);
    });

    console.log("[WARNING] 変数を操作することで意図せぬ動作をする場合が有ります。合格数などは操作しないでください。");
    try {
        navigator.serviceWorker.register("sw.js");
    } catch (e) {
        console.log("Service Worker非対応\n以下の機能は動作しません。\nオフライン時の実行");
    }
    //オプション処理
    //URL解析
    var type_query = location.search.match(/\?(?:[^&]*&)*t=([^&]+)/i);
    if (type_query) prepareExam({
        id: type_query[1]
    });

    if (exam_manager.resetStatus()) {
        if (confirm("試験中にブラウザを閉じました。試験を再開しますか。")) {
            prepareExam({
                id: exam_manager.now_exam_id
            });
        } else {
            exam_manager.resetStatus();
        }
    }
}

function setSystemInfo() {
    let info = exam_manager.system_info;
    document.getElementById("system_title").innerHTML = info.name;
    document.getElementById("system_description").innerHTML = info.description;
    document.title = info.name;
}

function setExamList() {
    var dom = document.getElementById("exam_list");
    dom.innerHTML = "";
    for (let exam_cnt = 0;; exam_cnt++) {
        let config = exam_manager.getExamConfig(exam_cnt);
        if (config === null) break;
        let exam_dom = document.createElement("div");
        exam_dom.className = "Paragraph";
        exam_dom.innerHTML = "<div class=\"Title\"><h1>" + config.name + "</h1></div>";
        for (let cnt = 1; cnt <= config.num; cnt++) {
            exam_dom.innerHTML += "<p><a id=\"" + config.prefix + cnt + "\" href=\"?t=" + config.prefix + cnt + "\" onclick=\"return prepareExam(this);\">" + config.name + "-" + cnt + "</a>" + (log[config.name + cnt] !== undefined ? (":正解数:" +
                log[config.name + cnt].good + (log[config.name + cnt].good >= config.passing_mark ? "(合格)" : "(不合格)")) : "") + "</p>";
        }
        dom.appendChild(exam_dom);
    }
}


function showExamlist(b) { /*b:true =>問題リスト表示 false=>問題表示*/
    document.getElementById("menu").style.display = b ? "" : "none";
    document.getElementById("exam").style.display = b ? "none" : "";
}

/*問題表示系統*/
function prepareExam(t) {
    if (t.id.includes("..")) {
        alert("XSS攻撃の疑いのあるアクセスを検知しました。読み込みを中止します。\nもしあなたが、リンクをクリックしてこのサイトに訪れた場合、リンク作成者が悪意のある人の可能性が有ります。");
        return;
    }
    var json_url = "json/" + t.id + ".json";
    exam_manager.now_exam_id = t.id;
    fetch(json_url).then(response => {
        if (!response.ok) throw response.statusText;
        else response.json().then(json => loadExam(json));
    }).catch(text => alert("ネットワーク接続中にエラーが発生しました。\n" + text));
    return false; /*For onclick*/
}

function loadExam(json) {
    showExamlist(false);
    exam_manager.question_json = json;
    showQuestion();
}

function showQuestion() {
    var json = exam_manager.next_question;
    var text_box = document.getElementById("question_text");
    if (json === null) return showResult();
    closeMessage(true);
    document.getElementById("question_title").innerHTML = "第" + qman.no + "問";
    text_box.innerHTML = "<p>" + json.text.replace(/\n/g, "<br />") + "</p><br />";

    if (json.img) {
        for (var len = json.img.length, cnt = 0; cnt < len; cnt++) {
            text_box.innerHTML += "<img src=\"img/" + json.img[cnt] + "\" /><br />";
        }
    }
    //こっから昔書いたHSPコード丸パクリ
    Math.round();
    for (var qlen = json.select.length, rndc = new Array(qlen), cnt = 0; qlen > cnt;) { //4つ以上対応可みたいな作りだが実際4固定 TODO:選択肢伸縮
        var rnum = Math.floor(Math.random() * qlen);
        if (rndc[rnum] === true) continue;
        if (rnum == 0) exam_manager.correct = cnt;
        rndc[rnum] = true;
        cnt++;
        text_box.innerHTML += cnt + ":" + json.select[rnum] + "<br />";
    }
}

function checkAnswer() {
    var radio_buttons = document.getElementsByName("answer");
    var selected = 0;
    for (var cnt = 0, len = radio_buttons.length; cnt < len; cnt++) {
        if (radio_buttons[cnt].checked) {
            selected = radio_buttons[cnt].value;
            radio_buttons[cnt].checked = false;
            break;
        }
    }

    var mes = "";
    var mcolor = "";
    if (selected == exam_manager.correct + 1) { /*無選択の場合対策*/
        mes = "<p>正解です。</p>";
        color = "palegreen";
        exam_manager.addRecord(true);
    } else {
        mes = "<p>不正解です。正しい答えは" + (qman.correct + 1) + "番です。</p>";
        color = "hotpink";
        exam_manager.addRecord(false);
    }
    mes += "<input type=\"button\" value=\"次へ\" onclick=\"showQuestion()\" />";
    document.getElementById("answer_box").style.display = "none";
    exam_manager.saveStatus();
    showMessage(mes, color);
}

function showResult() {
    document.getElementById("answer_box").style.display = "none";
    exam_manager.deleteSaveData()
    let result = exam_manager.record;
    var mes = "<p><strong>結果発表</strong></p><p>正答数:<strong>" + result.good + "</strong></p><p>誤答数:<strong>" + result.bad + "</strong></p>";
    var color = "";
    // TODO: prefix複数文字対応
    let current_config = exam_manager.getConfigByPrefix(exam_manager.now_exam_id.charAt(0));
    if (current_config !== null) {
        if (result.good >= current_config.passing_mark) {
            mes += "<p><strong>合格</strong>です。おめでとうございます。🎉👏</p>";
            color = "palegreen";

        } else {
            mes += "<p><strong>不合格</strong>です。もうすこしがんばりましょう。💪</p>";
            color = "hotpink";
        }

    } else {
        mes += "<p>合否判定ができませんでした。</p>";
        color = "grey";
    }
    log[exam_manager.now_exam_id] = result;
    localStorage.log = JSON.stringify(log);
    mes += "<input type=\"button\" value=\"終了\" onclick=\"endExam()\" />";
    showMessage(mes, color);
}

function endExam() {
    exam_manager.resetStatus();
    setExamList(); //log反映
    document.getElementById("menu").style.display = "";
    document.getElementById("exam").style.display = "none";
}

/*メッセージ表示系統*/
function showMessage(text, color) {
    var dom = document.getElementById("message_box");
    if (text) dom.innerHTML = text;
    if (color) dom.style.backgroundColor = color;
    dom.style.maxHeight = (dom.scrollHeight ? dom.scrollHeight : 100) + "px"; /*表示されないと先行けないので救済措置*/
}

function closeMessage(bool_show_answer_box) {
    document.getElementById("message_box").style.maxHeight = "0px";
    if (bool_show_answer_box) setTimeout("document.getElementById(\"answer_box\").style.display = \"\"",
        document.getElementById("message_box").style.transitionDuration.slice(0, -1) * 1000);
}

/*設定系統*/
function resetLog() {
    delete localStorage.log;
    log = {};
    setExamList();
}

// TODO: 再実装
function fetchAllJson() {
    /*全てのJSONにfetchかければService Workerがキャッシュしてくれるだろうという乱暴な考え*/
    var links = document.links;
    for (var len = links.length, cnt = 0; cnt < len; cnt++) {
        if (links[cnt].id !== undefined) fetch("json/" + links[cnt].id + ".json");
    }
}
