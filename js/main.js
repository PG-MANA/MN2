/*
Copyright 2018 PG_MANA
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

 https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*hashchangeの扱い方忘れた*/
/*let => varにしておいた、let使いたい*/
/*アロー関数使いたい*/
/*クラス使いたい*/
/*そうだ IE、潰そう*/
var qman = new Object({ /*question_manager*/
  no: 1,
  correct: 0,
  good: 0,
  bad: 0,
  exam_id: "" /*r2とかt4とか*/
});

var qjson;/*サイズがでかいのでqmanから除外(qmanは頻繁に保存するので)*/
var log; /*initにおいて初期化*/

/*初期化*/
function init() {
  log = localStorage.log !== undefined ? JSON.parse(localStorage.log) : new Object();
  setRuleList();
  setTecList();
  console.log("変数いじってチートするのはアカン");
  try {
    navigator.serviceWorker.register("sw.js");
  } catch (e) {
    console.log("Service Worker非対応なため、高度な制御が行なえません。");
  }
  //オプション処理
  var type_query = location.search.match(/\?(?:[^&]*&)*t=([^&]+)/i);
  if(type_query)prepareExam({id:type_query[1]});
  if(localStorage.qman){
    if(confirm("試験中にブラウザを閉じました。再開しますか。")){
      qman = JSON.parse(localStorage.qman);
      prepareExam({id:qman.exam_id});
    }else{
      delete localStorage.qman;
    }
  }
}

/*初期画面表示系統*/
function setRuleList() {
  var dom = document.getElementById("rulelist");
  dom.innerHTML = "";
  for (var cnt = 1; cnt <= 10; cnt++) {
    dom.innerHTML += "<p><a id=\"r" + cnt + "\" href=\"?t=r" + cnt + "\" onclick=\"return prepareExam(this);\">種別1" + cnt + "</a>" + (log["r" + cnt] !== undefined ? (":正解数:" +
      log["r" + cnt].good + (log["r" + cnt].judg ? "(合格)" : "(不合格)")) : "") + "</p>";
  }
}

function setTecList() {
  var dom = document.getElementById("teclist");
  dom.innerHTML = "";
  for (var cnt = 1; cnt <= 8; cnt++) {
    dom.innerHTML += "<p><a id=\"t" + cnt + "\" href=\"?t=t" + cnt + "\" onclick=\"return prepareExam(this);\">種別2" + cnt + "</a>" + (log["t" + cnt] !== undefined ? (":正解数:" +
      log["t" + cnt].good + (log["t" + cnt].judg ? "(合格)" : "(不合格)")) : "") + "</p>";
  }
}

function showExamlist(b) { /*b:true =>問題リスト表示 false=>問題表示*/
  document.getElementById("exam_list").style.display = b ? "" : "none";
  document.getElementById("exam").style.display = b ? "none" : "";
}

/*問題表示系統*/
function prepareExam(t) {
  var json_url = "json/" + t.id + ".json";
  qman.exam_id = t.id;

  try {
    fetch(json_url).then(function(response) {
      if (!response.ok) throw response.statusText;
      else response.json().then(function(json) {
        loadExam(json);
      });
    }).catch(function(text) {
      alert("ネットワーク接続中にエラーが発生しました。\n" + text);
    });
  } catch (e) {
    var http = new XMLHttpRequest();
    http.onload = function() {
      try {
        loadExam(JSON.parse(http.responseText));
      } catch (e) {
        alert("無理っぽい");
      }
    };
    http.onerror = function() {
      alert("無理っぽい");
    };
    http.open("GET", json_url);
    http.send();
  }
  return false; /*For onclick*/
}

function loadExam(json) {
  showExamlist(false);
  qjson = json;
  showQuestion();
}


function showQuestion() {
  closeMessage(true);
  var json = qjson[qman.no - 1];
  var text_box = document.getElementById("question_text");
  document.getElementById("question_title").innerHTML = "第" + qman.no + "問";
  text_box.innerHTML = "<p>" + json.text.replace(/\n/g, "<br />") + "</p><br />";

  if (json.img) {
    for (var len = json.img.length, cnt = 0; cnt < len; cnt++) {
      text_box.innerHTML += "<img src=\"img/" + json.img[cnt] + "\" /><br />";
    }
  }
  //こっからHSPコード丸パクリ
  Math.round();
  for (var qlen = json.select.length, rndc = new Array(qlen), cnt = 0; qlen > cnt;) { //4つ以上対応可みたいな作りだが実際4固定
    var rnum = Math.floor(Math.random() * qlen);
    if (rndc[rnum] === true) continue;
    if (rnum == 0) qman.correct = cnt;
    rndc[rnum] = true;
    cnt++;
    text_box.innerHTML += cnt + ":" + json.select[rnum] + "<br />";
  }
}

function checkAnswer() {
  var radios = document.getElementsByName("answer");
  var selected = 0;
  for (var cnt = 0, len = radios.length; cnt < len; cnt++) {
    if (radios[cnt].checked) {
      selected = radios[cnt].value;
      radios[cnt].checked = false;
      break;
    }
  }

  var mes = "";
  var mcolor = "";
  if (selected == qman.correct + 1) { /*無選択の場合対策*/
    mes = "<p>正解です。</p>";
    color = "palegreen";
    qman.good++;
  } else {
    mes = "<p>不正解です。正しい答えは" + (qman.correct + 1) + "番です。</p>";
    color = "hotpink";
    qman.bad++;
  }
  qman.no++;
  mes += "<input type=\"button\" value=\"次へ\" onclick=\"" + (qman.no > qjson.length ? "showResult()" : "showQuestion()") + "\" />";
  document.getElementById("answer_box").style.display = "none";
  localStorage.qman = JSON.stringify(qman);//restore用
  showMessage(mes, color);
}

function showResult() {
  document.getElementById("answer_box").style.display = "none";
  delete localStorage.qman;
  var mes = "<p><strong>結果発表</strong></p><p>正答数:<strong>" + qman.good + "</strong></p><p>誤答数:<strong>" + qman.bad + "</strong></p>";
  var color = "";
  if (qman.good >= (qman.exam_id.charAt(0) == "r" ? 11 : 9)) {
    mes += "<p><strong>合格</strong>です。おめでとうございます。🎉👏</p>";
    color = "palegreen";
    log[qman.exam_id] = {
      judg: true,
      good: qman.good,
      bad: qman.bad
    };
  } else {
    mes += "<p><strong>不合格</strong>です。もうすこしがんばりましょう。💪</p>";
    color = "hotpink";
    log[qman.exam_id] = {
      judg: false,
      good: qman.good,
      bad: qman.bad
    };
  }
  localStorage.log = JSON.stringify(log);
  mes += "<input type=\"button\" value=\"終了\" onclick=\"endExam()\" />";
  showMessage(mes, color);
}

function endExam() {
  qman.good = 0;
  qman.bad = 0;
  qman.no = 1;
  qman.exam_id.charAt(0) == "r" ? setRuleList() : setTecList();//log反映
  document.getElementById("exam_list").style.display = "";
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
function resetLog(){
  delete localStorage.log;
  log = new Object();
  setRuleList();
  setTecList();
}

function fetchAllJson(){
  /*全てのJSONにfetchかければService Workerがキャッシュしてくれるだろうという乱暴な考え*/
  var links = document.links;
  for(var len = links.length, cnt = 0;cnt < len;cnt++){
    if(links[cnt].id !== undefined)fetch("json/" + links[cnt].id + ".json");
  }
}
