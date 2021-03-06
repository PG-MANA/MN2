/*License:See LICENSE.md*/

class ExaminationManager {
  /*セッターゲッターはスネークケース、関数はキャメルケースという*/
  constructor() {
    this.resetStatus();
    this.json = {};
  }

  resetStatus() {
    this.status = {
      no: 0,
      correct: 0,
      good: 0,
      bad: 0,
      exam_no: 0,
      exam_prefix: ""
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
    while (cnt < len && this.config.list[cnt].prefix != p) cnt++;
    return (cnt === len) ? null : this.config.list[cnt];
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

  get now_exam_no() {
    return this.status.exam_no;
  }

  set now_exam_no(n) {
    this.status.exam_no = n;
  }

  get now_exam_prefix() {
    return this.status.exam_prefix;
  }

  set now_exam_prefix(p) {
    this.status.exam_prefix = p;
  }
  set question_json(json) {
    this.json = json;
  }

  get next_question() {
    return (this.json.length > this.status.no) ? this.json[this.status.no++] : null;
  }

  get question_no() {
    return this.status.no;
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

let log; /*initにおいて初期化*/
let exam_manager = new ExaminationManager();
const json_location = "config/json/";
const img_location = "config/img/";

/*初期化*/
document.addEventListener("DOMContentLoaded", init); //ATTENTION: 即時実行される

function init() {
  document.getElementById("answer_submitting_button").onclick = checkAnswer;//For CSP
  document.getElementById("reset_button").onclick = resetLog;
  document.getElementById("exam_fetching_button").onclick = fetchAllJson;
  log = localStorage.log !== undefined ? JSON.parse(localStorage.log) : {};
  fetch(json_location + "config.json").then(response => {
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
  let query = getQuery();
  if (query["p"] && query["n"]) prepareExam({
    dataset: {
      prefix: query["p"],
      no: query["n"]
    }
  });

  if (exam_manager.restoreStatus()) {
    if (confirm("試験中にブラウザを閉じました。試験を再開しますか。")) {
      prepareExam({
        dataset: {
          prefix: exam_manager.now_exam_prefix,
          no: exam_manager.now_exam_no
        }
      });
    } else {
      exam_manager.resetStatus();
    }
  }
}

function getQuery() {
  let list = location.search.substring(1).split("&");
  let result = new Array();
  for (let cnt = list.length - 1; cnt >= 0; cnt--) {
    let temp = list[cnt].match(/^([^=]+)=(.+)$/);
    if (temp !== null) result[temp[1]] = temp[2];
  }
  return result;
}

function setSystemInfo() {
  let info = exam_manager.system_info;
  document.getElementById("system_title").innerHTML = info.name;
  document.getElementById("system_description").innerHTML = info.description;
  document.title = info.name;
}

function setExamList() {
  let dom = document.getElementById("exam_list");
  dom.innerHTML = "";
  for (let exam_cnt = 0;; exam_cnt++) {
    let config = exam_manager.getExamConfig(exam_cnt);
    if (config === null) break;
    let exam_dom = document.createElement("div");
    exam_dom.className = "Paragraph";
    exam_dom.innerHTML = "<div class=\"Title\"><h1>" + config.name + "</h1></div>";
    let list_dom = document.createElement("ul");
    list_dom.className = "select_exam_list";
    for (let cnt = 1; cnt <= config.num; cnt++) {
      let exam_entry_dom = document.createElement("li");
      let exam_entry_link_dom = document.createElement("a");
      exam_entry_link_dom.dataset.prefix = config.prefix;
      exam_entry_link_dom.dataset.no = cnt;
      exam_entry_link_dom.setAttribute("href", "?p=" + config.prefix + "&n=" + cnt);
      exam_entry_link_dom.innerHTML = config.name + "-" + cnt;
      exam_entry_link_dom.onclick = t => prepareExam(t.target);
      let exam_entry_text_dom = document.createTextNode(log[config.prefix] !== undefined && log[config.prefix][cnt] !== undefined ? (":正解数:" +
      log[config.prefix][cnt].good + (log[config.prefix][cnt].good >= config.passing_mark ? "(合格)" : "(不合格)")) : "");
      exam_entry_dom.appendChild(exam_entry_link_dom);
      exam_entry_dom.appendChild(exam_entry_text_dom);
      list_dom.appendChild(exam_entry_dom);
    }
    exam_dom.appendChild(list_dom);
    dom.appendChild(exam_dom);
  }
}


function showExamlist(b) { /*b:true =>問題リスト表示 false=>問題表示*/
  document.getElementById("menu").style.display = b ? "" : "none";
  document.getElementById("exam").style.display = b ? "none" : "";
}

/*問題表示系統*/
function prepareExam(t) {
  if (t.dataset.prefix.includes("..") || t.dataset.no.includes("..")) {
    alert("XSS攻撃の疑いのあるアクセスを検知しました。読み込みを中止します。\nもしあなたが、リンクをクリックしてこのサイトに訪れた場合、リンク作成者が悪意のある人の可能性が有ります。");
    return;
  }
  let json_url = json_location + t.dataset.prefix + "/" + t.dataset.no + ".json";
  exam_manager.now_exam_prefix = t.dataset.prefix;
  exam_manager.now_exam_no = t.dataset.no;
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
  let json = exam_manager.next_question;
  let text_box = document.getElementById("question_text");
  if (json === null) return showResult();
  closeMessage(true);
  document.getElementById("question_title").innerHTML = "第" + exam_manager.question_no + "問";
  text_box.innerHTML = "<p>" + json.text.replace(/\n/g, "<br />") + "</p><br />";

  if (json.img) {
    for (let len = json.img.length, cnt = 0; cnt < len; cnt++) {
      text_box.innerHTML += "<img src=\"" + img_location + exam_manager.now_exam_prefix + "/" + json.img[cnt] + "\" /><br />";
    }
  }
  //選択肢&回答欄生成
  let select_box = document.getElementById("select_box"); //HTML5の規格ではid要素はデフォルトでグローバル変数になってるらしいが、ブラウザで差異があるのでローカル変数で再定義する
  select_box.innerHTML = "";
  Math.round();
  for (let qlen = json.select.length, rndc = new Array(qlen), cnt = 0; qlen > cnt;) {
    let rnum = Math.floor(Math.random() * qlen);
    if (rndc[rnum] === true) continue;
    if (rnum === 0) exam_manager.correct = cnt;
    rndc[rnum] = true;
    cnt++;
    select_box.innerHTML += "<label><input name=\"answer\" type=\"radio\" value=\"" + cnt + "\" accesskey=\"" + cnt + "\" />" + cnt + "</label>";
    text_box.innerHTML += cnt + ":" + json.select[rnum] + "<br />";
  }
}

function checkAnswer() {
  let radio_buttons = document.getElementsByName("answer");
  let selected = 0;
  for (let cnt = 0, len = radio_buttons.length; cnt < len; cnt++) {
    if (radio_buttons[cnt].checked) {
      selected = radio_buttons[cnt].value;
      radio_buttons[cnt].checked = false;
      break;
    }
  }

  let message = "";
  let message_color = "";
  if (Number(selected) === exam_manager.correct + 1) { /*無選択の場合対策*/
    message = "<p>正解です。</p>";
    message_color = "palegreen";
    exam_manager.addRecord(true);
  } else {
    message = "<p>不正解です。正しい答えは" + (exam_manager.correct + 1) + "番です。</p>";
    message_color = "hotpink";
    exam_manager.addRecord(false);
  }
  let next_button = document.createElement("input");
  next_button.setAttribute("type", "button");
  next_button.setAttribute("value", "次へ");
  next_button.onclick = showQuestion;
  document.getElementById("answer_box").style.display = "none";
  exam_manager.saveStatus();
  showMessage(message, message_color, [next_button]);
}

function showResult() {
  document.getElementById("answer_box").style.display = "none";
  exam_manager.deleteSaveData()
  let result = exam_manager.record;
  let message = "<p><strong>結果発表</strong></p><p>正答数:<strong>" + result.good + "</strong></p><p>誤答数:<strong>" + result.bad + "</strong></p>";
  let message_color = "";
  let current_config = exam_manager.getConfigByPrefix(exam_manager.now_exam_prefix);
  if (current_config !== null) {
    if (result.good >= current_config.passing_mark) {
      message += "<p><strong>合格</strong>です。おめでとうございます。🎉👏</p>";
      message_color = "palegreen";

    } else {
      message += "<p><strong>不合格</strong>です。もうすこしがんばりましょう。💪</p>";
      message_color = "hotpink";
    }

  } else {
    message += "<p>合否判定ができませんでした。</p>";
    message_color = "grey";
  }
  if (log[exam_manager.now_exam_prefix] === undefined) log[exam_manager.now_exam_prefix] = {};
  log[exam_manager.now_exam_prefix][exam_manager.now_exam_no] = result;
  localStorage.log = JSON.stringify(log);
  let finish_button = document.createElement("input");
  finish_button.setAttribute("type", "button");
  finish_button.setAttribute("value", "終了");
  finish_button.onclick = endExam;
  showMessage(message, message_color, [finish_button]);
}

function endExam() {
  exam_manager.resetStatus();
  setExamList(); //log反映
  document.getElementById("menu").style.display = "";
  document.getElementById("exam").style.display = "none";
}

/*メッセージ表示系統*/
function showMessage(text, message_color, buttons/*Array*/) {
  let dom = document.getElementById("message_box");
  if (text) dom.innerHTML = text;
  if (message_color) dom.style.backgroundColor = message_color;
  for(let cnt = 0; cnt < buttons.length; cnt++) { //参照回数が少ないはずなのでlengthを代入してない
    dom.appendChild(buttons[cnt]);
  }
  dom.style.maxHeight = (dom.scrollHeight ? dom.scrollHeight : 100) + "px"; /*表示されないと先行けないので救済措置*/
}

function closeMessage(bool_show_answer_box) {
  document.getElementById("message_box").style.maxHeight = "0px";
  if (bool_show_answer_box) setTimeout(() => document.getElementById("answer_box").style.display = "",
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
  /*全てのJSONや画像ににfetchかければService Workerがキャッシュしてくれるだろうという乱暴な考え*/
  try {
    if (navigator.serviceWorker.controller.state != "activated") throw (null);
  } catch (e) {
    alert("このブラウザではこの機能は使用できません。");
    return;
  }
  if (!confirm("この処理は大量のネットワーク通信を行う可能性が有ります。その場合サーバに負担をかける可能性が有ります。続行しますか。")) return;
  let links = document.getElementById("exam_list").getElementsByTagName("a");
  for (let cnt = links.length - 1; cnt >= 0; cnt--) {
    fetch(json_location + links[cnt].dataset.prefix + "/" + links[cnt].dataset.no + ".json").then(response => {
      response.json().then(json => {
        for (let json_cnt = json.length - 1; json_cnt >= 0; json_cnt--) {
          if (Array.isArray(json[json_cnt].img)) {
            for (let img_cnt = json[json_cnt].img.length - 1; img_cnt >= 0; img_cnt--) fetch(img_location + links[cnt].dataset.prefix + "/" + json[json_cnt].img[img_cnt]);
          }
        }
      });
    });
  }
}
