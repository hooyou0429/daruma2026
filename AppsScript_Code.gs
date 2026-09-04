/**
 * 일본어 말하기 연습 앱 - 구글시트 기록 + 문제(연습 문장) 관리용 Google Apps Script
 *
 * [사용 방법]
 * 1. 결과를 저장할 구글 스프레드시트를 새로 만듭니다.
 * 2. 메뉴에서 확장 프로그램 > Apps Script 를 클릭합니다.
 * 3. 기본으로 열려 있는 코드를 모두 지우고, 이 파일의 내용 전체를 붙여넣습니다.
 * 4. 저장(디스크 아이콘) 후, 우측 상단의 [배포] > [새 배포]를 클릭합니다.
 * 5. 유형 선택에서 톱니바퀴를 눌러 "웹 앱"을 선택합니다.
 * 6. "실행 계정"은 "나(내 계정)", "액세스 권한이 있는 사용자"는 "모든 사용자"로 설정합니다.
 * 7. [배포]를 누르고, 권한 승인 절차를 진행합니다(처음에는 "Google에서 확인하지 않은 앱" 경고가
 *    뜰 수 있는데, "고급" > "(프로젝트 이름)으로 이동"을 눌러 진행하면 됩니다. 본인이 만든 스크립트이므로 안전합니다).
 * 8. 배포가 끝나면 나오는 "웹 앱 URL"을 복사합니다.
 * 9. index.html 파일의 CONFIG.APPS_SCRIPT_URL 값에 그 URL을 붙여넣습니다.
 *
 * [주의] 코드를 수정한 뒤에는 반드시 [배포] > [배포 관리] > 연필 아이콘 > [새 버전]으로
 *        다시 배포해야 변경 사항이 실제 웹 앱에 반영됩니다. (기존에 이미 배포되어 있는 분들도
 *        이 파일로 교체한 뒤 "새 버전"으로 재배포해야 아래 "문제은행" 기능이 동작합니다.)
 *
 * [새로 추가된 기능 1 - 문제(연습 문장)를 구글시트로 관리]
 * 이 스크립트를 붙여넣고 재배포하면, 이 스크립트가 연결된 스프레드시트에 "문제은행"이라는
 * 탭이 자동으로 하나 생깁니다(이미 있으면 그대로 사용). 그 탭에 카테고리 / 일본어 문장 / 한국어 뜻
 * 세 칸으로 문제 목록이 있고(처음 생성 시 현재 앱에 있던 문장으로 미리 채워져 있습니다), 이후로는
 * index.html이나 questions.js를 건드리거나 Netlify에 재배포할 필요 없이 이 시트의 행을
 * 추가/수정/삭제하기만 하면 학생이 접속할 때 바로 반영됩니다.
 * (인터넷 문제 등으로 이 시트를 불러오지 못하면 questions.js에 있는 기본 문장으로 자동 대체되니
 *  안심하고 사용하셔도 됩니다.)
 *
 * [새로 추가된 기능 2 - 한자→히라가나 채점 보정 사전도 구글시트로 관리]
 * 위와 같은 방식으로 "한자읽기"라는 탭도 자동으로 생깁니다. 한자(또는 인식될 수 있는 표기) /
 * 히라가나(정답으로 처리할 표기) 두 칸으로 되어 있고, 학생이 히라가나로만 말했는데 음성 인식이
 * 한자로 결과를 반환해서 오답 처리되는 문제를 막기 위한 사전입니다(예: "明日" 행을 추가하면
 * "明日"라고 인식되어도 "あした"로 쓴 문제를 맞은 것으로 채점). 이 탭도 행을 추가/수정/삭제하면
 * index.html을 건드리지 않아도 바로 반영되며, 시트를 못 불러올 때는 index.html에 내장된 기본
 * 사전으로 자동 대체됩니다.
 */

// 기록이 저장될 시트 이름
var SHEET_NAME = "기록";

// 시트의 헤더(첫 행) 구성
var HEADERS = ["타임스탬프", "학번", "이름", "연습 문장", "인식된 발음", "점수(%)", "통과 여부"];

// 문제(연습 문장) 목록이 저장될 시트 이름
var SENTENCE_SHEET_NAME = "문제은행";
var SENTENCE_HEADERS = ["카테고리", "일본어 문장", "한국어 뜻"];

// "문제은행" 탭이 처음 생성될 때 미리 채워 넣을 기본 문제 목록
// (형식: [카테고리, 일본어 문장, 한국어 뜻])
// 한자 읽는 법(후리가나)이 필요하면 일본어 문장 칸에 <ruby>漢字<rt>よみ</rt></ruby> 형식으로 입력해도 됩니다.
var DEFAULT_SENTENCES = [
  ["인사", "こんにちは。", "안녕하세요. (낮 인사)"],
  ["인사", "おはようございます。", "안녕하세요. (아침 인사)"],
  ["인사", "こんばんは。", "안녕하세요. (저녁 인사)"],
  ["인사", "いただきます。", "잘 먹겠습니다."],
  ["인사", "ごちそうさまでした。", "잘 먹었습니다."],
  ["인사", "ありがとうございます。", "감사합니다."],
  ["인사", "またあした。", "내일 또 봐요."],
  ["인사", "もしもし。", "여보세요"],
  ["인사", "はい。", "네~"],
  ["인사", "いいえ。", "아니요~"],
  ["인사", "ひさしぶり。", "오래간만이야~"],
  ["인사", "バイバイ。", "잘가~"],
  ["인사", "さようなら。", "안녕히 계세요~"],
  ["인사", "すみません。", "실례합니다. 미안합니다."],
  ["인사", "ごめんなさい。", "미안합니다"],
  ["인사", "いってきます。", "다녀오겠습니다"],
  ["인사", "いってらっしゃい", "다녀오세요~."],
  ["인사", "ただいま", "다녀왔습니다."],
  ["인사", "おかえりなさい。", "잘 다녀오셨어요?"],
  ["인사", "おじゃまします", "실례합니다(남의 집을 방문할 때)"],
  ["인사", "いらっしゃい。どうぞ", "어서오세요~들어오세요~(손님에게)"],
  ["자기소개", "はじめまして。", "처음뵙겠습니다."],
  ["자기소개", "わたしはかんこくじんです。", "저는 한국인입니다."],
  ["자기소개", "こうこうせいです。", "고등학생입니다."],
  ["자기소개", "よろしくおねがいします。", "잘 부탁드립니다"],
  ["길벗 2과", "なにがすきですか。", "무엇을 좋아하세요?"],
  ["길벗 2과", "アニメがすきです。", "애니메이션을 좋아해요."],
  ["길벗 2과", "それはなんですか。", "그것은 무엇인가요?."],
  ["길벗 2과", "アニメのキャラクターです。", "애니메이션의 캐릭터예요."],
  ["길벗 2과", "なにがとくいですか。", "무엇을 잘해요?"],
  ["길벗 2과", "ダンスかとくいです。", "춤을 잘 춰요."],
  ["길벗 2과", "りょうりがとくいです。", "요리를 잘해요."],
  ["길벗 2과", "サッカーがとくいなんですね。", "축구를 잘하는군요~."],
  ["길벗 2과", "すきですけど、まだまだです。", "좋아하지만 아직 멀었어요."],
  ["길벗 2과", "すうがく、じょうずですね。", "수학, 잘하시네요~!"],
  ["길벗 2과", "おしゃべり、すきなんですね。", "수다 좋아하는군요."],
  ["길벗 2과", "おしゃべりとりょこうがすきです。", "수다와 요리를 좋아해요."],
  ["길벗 2과", "そうなんですね。", "그렇군요~."],
  ["길벗 2과", "でも、すごいですね。", "그래도 대단해요."],
  ["길벗 2과", "なにがすき？", "무엇을 좋아해?"],
  ["길벗 2과", "おんがくがすき。", "음악을 좋아해."],
  ["길벗 2과", "どんなたべものがすき？", "어떤 음식을 좋아해?"],
  ["길벗 2과", "とんかつがすき。", "돈까스를 좋아해."],
  ["길벗 2과", "うめぼしがにがてです。", "매실장아찌를 잘 못 먹어요."],
  ["길벗 2과", "どんなどうぶつがすき？", "어떤 동물을 좋아해?"],
  ["길벗 2과", "ねこがすき", "고양이를 좋아해."],
  ["길벗 2과", "わたしも", "나도."],
  ["길벗 2과", "いいよね", "좋지~"]
];

// 한자→히라가나 채점 보정 사전이 저장될 시트 이름
var READING_SHEET_NAME = "한자읽기";
var READING_HEADERS = ["한자(또는 인식될 수 있는 표기)", "히라가나(정답으로 처리)"];

// "한자읽기" 탭이 처음 생성될 때 미리 채워 넣을 기본 사전 (index.html에 내장되어 있던 것과 동일)
var DEFAULT_READINGS = [
  ["明日", "あした"],
  ["私", "わたし"],
  ["韓国人", "かんこくじん"],
  ["高校生", "こうこうせい"],
  ["お願いします", "おねがいします"],
  ["何ですか", "なんですか"],
  ["何が", "なにが"],
  ["得意", "とくい"],
  ["料理", "りょうり"],
  ["数学", "すうがく"],
  ["上手", "じょうず"],
  ["お喋り", "おしゃべり"],
  ["旅行", "りょこう"],
  ["音楽", "おんがく"],
  ["食べ物", "たべもの"],
  ["梅干し", "うめぼし"],
  ["苦手", "にがて"],
  ["動物", "どうぶつ"],
  ["猫", "ねこ"],
  ["好き", "すき"],
  ["久しぶり", "ひさしぶり"],
  ["行ってきます", "いってきます"],
  ["お邪魔します", "おじゃまします"],
  ["初めまして", "はじめまして"],
  ["お帰りなさい", "おかえりなさい"],
  ["ご馳走様でした", "ごちそうさまでした"]
];

function doPost(e) {
  try {
    var sheet = getOrCreateSheet_();
    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      formatTimestamp_(data.ts),
      data.studentId || "",
      data.studentName || "",
      data.sentence || "",
      data.recognized || "",
      typeof data.score === "number" ? data.score : "",
      data.pass ? "통과" : "재도전"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 브라우저(또는 앱)로 GET 요청이 들어왔을 때 처리
// - ?action=sentences 로 요청하면 "문제은행" 탭의 문제 목록을 JSON으로 반환
// - 그 외(파라미터 없이 URL로 직접 접속 등)에는 정상 연결 확인용 안내 문구를 반환
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === "sentences") {
    return getSentencesJson_();
  }
  if (action === "readings") {
    return getReadingsJson_();
  }
  return ContentService.createTextOutput(
    "이 주소는 정상적으로 연결되어 있습니다. 이 화면이 보인다면 앱과 연동 준비가 된 것입니다."
  );
}

function getSentencesJson_() {
  try {
    var sheet = getOrCreateSentenceSheet_();
    var lastRow = sheet.getLastRow();
    var list = [];
    if (lastRow >= 2) {
      var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
      for (var i = 0; i < values.length; i++) {
        var cat = String(values[i][0] || "").trim();
        var jp = String(values[i][1] || "").trim();
        var ko = String(values[i][2] || "").trim();
        if (cat && jp) {
          list.push({ category: cat, jp: jp, ko: ko });
        }
      }
    }
    return ContentService
      .createTextOutput(JSON.stringify(list))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSentenceSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SENTENCE_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SENTENCE_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SENTENCE_HEADERS);
    sheet.getRange(1, 1, 1, SENTENCE_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    if (DEFAULT_SENTENCES.length > 0) {
      sheet.getRange(2, 1, DEFAULT_SENTENCES.length, 3).setValues(DEFAULT_SENTENCES);
    }
  }
  return sheet;
}

function getReadingsJson_() {
  try {
    var sheet = getOrCreateReadingSheet_();
    var lastRow = sheet.getLastRow();
    var list = [];
    if (lastRow >= 2) {
      var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (var i = 0; i < values.length; i++) {
        var kanji = String(values[i][0] || "").trim();
        var reading = String(values[i][1] || "").trim();
        if (kanji && reading) {
          list.push({ kanji: kanji, reading: reading });
        }
      }
    }
    return ContentService
      .createTextOutput(JSON.stringify(list))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateReadingSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(READING_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(READING_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(READING_HEADERS);
    sheet.getRange(1, 1, 1, READING_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    if (DEFAULT_READINGS.length > 0) {
      sheet.getRange(2, 1, DEFAULT_READINGS.length, 2).setValues(DEFAULT_READINGS);
    }
  }
  return sheet;
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function formatTimestamp_(isoString) {
  try {
    var d = isoString ? new Date(isoString) : new Date();
    return Utilities.formatDate(d, "GMT+9", "yyyy-MM-dd HH:mm:ss");
  } catch (e) {
    return new Date();
  }
}
