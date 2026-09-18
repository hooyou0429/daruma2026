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
 * 이 스크립트가 연결된 스프레드시트에 "문제은행"이라는 탭이 있습니다(이미 만들어져 있으면
 * 그대로 사용, 없으면 헤더만 있는 빈 탭을 새로 만듦). 그 탭에 카테고리 / 일본어 문장 / 한국어 뜻
 * 세 칸으로 문제 목록이 있고, index.html이나 questions.js를 건드리거나 Netlify에 재배포할
 * 필요 없이 이 시트의 행을 추가/수정/삭제하기만 하면 학생이 접속할 때 바로 반영됩니다.
 * (인터넷 문제 등으로 이 시트를 불러오지 못하면 questions.js의 SENTENCES에 있는 기본 문장으로
 *  자동 대체되니 안심하고 사용하셔도 됩니다. 이 기본값은 이 .gs 파일에는 더 이상 두지 않고
 *  questions.js에서만 관리합니다.)
 *
 * [새로 추가된 기능 2 - 한자→히라가나 채점 보정 사전도 구글시트로 관리]
 * 위와 같은 방식으로 "한자읽기"라는 탭도 있습니다. 한자(또는 인식될 수 있는 표기) /
 * 히라가나(정답으로 처리할 표기) 두 칸으로 되어 있고, 학생이 히라가나로만 말했는데 음성 인식이
 * 한자로 결과를 반환해서 오답 처리되는 문제를 막기 위한 사전입니다(예: "明日" 행을 추가하면
 * "明日"라고 인식되어도 "あした"로 쓴 문제를 맞은 것으로 채점). 이 탭도 행을 추가/수정/삭제하면
 * index.html을 건드리지 않아도 바로 반영되며, 시트를 못 불러올 때는 questions.js의 READINGS에
 * 있는 기본 사전으로 자동 대체됩니다(이 기본값도 이 .gs 파일이 아니라 questions.js에서 관리).
 */

// 기록이 저장될 시트 이름
var SHEET_NAME = "기록";

// 시트의 헤더(첫 행) 구성
var HEADERS = ["타임스탬프", "학번", "이름", "연습 문장", "인식된 발음", "점수(%)", "통과 여부"];

// 문제(연습 문장) 목록이 저장될 시트 이름
var SENTENCE_SHEET_NAME = "문제은행";
var SENTENCE_HEADERS = ["카테고리", "일본어 문장", "한국어 뜻"];

// 한자→히라가나 채점 보정 사전이 저장될 시트 이름
var READING_SHEET_NAME = "한자읽기";
var READING_HEADERS = ["한자(또는 인식될 수 있는 표기)", "히라가나(정답으로 처리)"];

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
