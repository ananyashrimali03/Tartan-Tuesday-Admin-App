// ============================================================
// Google Apps Script: Tartan Tuesday Sheets API
//
// SETUP:
// 1. Open your Google Sheet
// 2. Go to Extensions > Apps Script
// 3. Paste this entire file into Code.gs
// 4. Click Deploy > Manage deployments > Edit (pencil icon)
// 5. Set version to "New version" and click Deploy
// 6. Copy the web app URL
// ============================================================

// ---- API key validation ----
function validateKey(e) {
  var token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
  if (secret && token !== secret) {
    return false;
  }
  return true;
}

// ---- doGet: handles ALL operations (reads and writes) ----
function doGet(e) {
  try {
    if (!validateKey(e)) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAllData';
    var result;

    switch (action) {
      case 'getStudents':
        result = getStudents();
        break;
      case 'getSwipes':
        result = getSwipes();
        break;
      case 'getAllData':
        result = { students: getStudents(), swipes: getSwipes() };
        break;
      case 'getComparisonData':
        result = getComparisonData();
        break;
      case 'syncComparison':
        result = syncAllComparisonData();
        break;
      case 'getInventory':
        result = getInventory();
        break;

      case 'addSwipe':
        var swipeData = JSON.parse(e.parameter.data);
        result = addSwipe(swipeData);
        break;
      case 'deleteSwipes':
        result = deleteSwipes(e.parameter.studentId, e.parameter.date);
        break;
      case 'bulkAddSwipes':
        var swipesData = JSON.parse(e.parameter.data);
        result = bulkAddSwipes(swipesData);
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Keep doPost as fallback
function doPost(e) {
  try {
    if (!validateKey(e)) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var result;

    switch (action) {
      case 'addSwipe':
        result = addSwipe(payload.data);
        break;
      case 'deleteSwipes':
        result = deleteSwipes(payload.studentId, payload.date);
        break;
      case 'bulkAddSwipes':
        result = bulkAddSwipes(payload.data);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ---- READ FUNCTIONS ----

function getStudents() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Students');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 12).getValues();

  return data.map(function(row) {
    var id = String(row[0] || '').trim();
    return {
      id: id,
      firstName: row[7] || row[6] || '',
      lastName: row[8] || '',
      email: row[11] || '',
      degreeLevel: row[10] || '',
      preferredYear: row[9] || ''
    };
  }).filter(function(s) {
    return s.id && s.id.length === 9 && !isNaN(s.id);
  });
}

function getSwipes() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Swipes');
  if (!sheet || sheet.getLastRow() < 4) return [];

  var numRows = sheet.getLastRow() - 3;
  var data = sheet.getRange(4, 1, numRows, 11).getValues();

  return data.map(function(row) {
    return {
      studentId: String(row[0] || '').trim(),
      pointsEarned: Number(row[1]) || 0,
      pointsRedeemed: Number(row[2]) || 0,
      date: formatDate(row[3]),
      cumulativePoints: Number(row[4]) || 0,
      prizeRedeemed: row[5] || null,
      size: row[6] || null,
      firstName: row[7] || '',
      lastName: row[8] || '',
      degreeLevel: row[9] || '',
      email: row[10] || ''
    };
  }).filter(function(s) {
    return s.studentId && s.studentId.length === 9;
  });
}

// ---- WRITE FUNCTIONS ----

function addSwipe(swipeData) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Swipes');
  var newRow = sheet.getLastRow() + 1;

  sheet.getRange(newRow, 1).setValue(String(swipeData.studentId));
  sheet.getRange(newRow, 2).setValue(swipeData.pointsEarned || 0);
  sheet.getRange(newRow, 3).setValue(swipeData.pointsRedeemed || 0);
  sheet.getRange(newRow, 4).setValue(swipeData.date);

  if (swipeData.prizeRedeemed) {
    sheet.getRange(newRow, 6).setValue(swipeData.prizeRedeemed);
  }
  if (swipeData.size) {
    sheet.getRange(newRow, 7).setValue(swipeData.size);
  }

  copyFormulasToRow(sheet, newRow);

  // Auto-update the Data Comparison sheet for every check-in (not redemptions)
  if ((swipeData.pointsEarned || 0) > 0) {
    try {
      updateComparisonData(swipeData.date);
    } catch (compErr) {
      Logger.log('Comparison auto-update failed: ' + compErr.message);
    }
  }

  return { success: true, row: newRow };
}

function deleteSwipes(studentId, date) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Swipes');
  if (!sheet || sheet.getLastRow() < 4) {
    return { success: true, deleted: 0 };
  }

  var numRows = sheet.getLastRow() - 3;
  var data = sheet.getRange(4, 1, numRows, 4).getValues();
  var deletedCount = 0;

  for (var i = data.length - 1; i >= 0; i--) {
    var rowStudentId = String(data[i][0]).trim();
    var rowDate = formatDate(data[i][3]);

    if (rowStudentId === String(studentId) && rowDate === date) {
      sheet.deleteRow(i + 4);
      deletedCount++;
    }
  }

  // Refresh the count for this date in the comparison sheet after deletion
  try {
    updateComparisonData(date);
  } catch (compErr) {
    Logger.log('Comparison update after delete failed: ' + compErr.message);
  }

  return { success: true, deleted: deletedCount };
}

function bulkAddSwipes(swipesArray) {
  if (!swipesArray || swipesArray.length === 0) {
    return { success: true, count: 0 };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Swipes');
  var startRow = sheet.getLastRow() + 1;

  // Collect unique check-in dates to update comparison later
  var uniqueDates = {};

  for (var i = 0; i < swipesArray.length; i++) {
    var s = swipesArray[i];
    var row = startRow + i;

    sheet.getRange(row, 1).setValue(String(s.studentId));
    sheet.getRange(row, 2).setValue(s.pointsEarned || 0);
    sheet.getRange(row, 3).setValue(s.pointsRedeemed || 0);
    sheet.getRange(row, 4).setValue(s.date);

    if (s.prizeRedeemed) {
      sheet.getRange(row, 6).setValue(s.prizeRedeemed);
    }
    if (s.size) {
      sheet.getRange(row, 7).setValue(s.size);
    }

    copyFormulasToRow(sheet, row);

    if ((s.pointsEarned || 0) > 0 && s.date) {
      uniqueDates[s.date] = true;
    }
  }

  // Update comparison sheet for all unique dates in this bulk import
  var dates = Object.keys(uniqueDates).sort();
  for (var d = 0; d < dates.length; d++) {
    try {
      updateComparisonData(dates[d]);
    } catch (compErr) {
      Logger.log('Comparison update for ' + dates[d] + ' failed: ' + compErr.message);
    }
  }

  return { success: true, count: swipesArray.length, comparisonUpdated: dates.length };
}

// ============================================================
// COMPARISON SHEET — HELPERS
// ============================================================

// Find the Data Comparison sheet by trying common names
function getComparisonSheet() {
  var candidates = ['Data Comparison', 'Comparison', 'data comparison', 'YoY', 'Year Comparison', 'Weekly Comparison'];
  for (var i = 0; i < candidates.length; i++) {
    var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(candidates[i]);
    if (s) return s;
  }
  return null;
}

// Find a row (1-indexed) in a sheet whose first column matches the given label
function findRowByLabel(sheet, label) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var labels = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < labels.length; i++) {
    if (String(labels[i][0]).trim() === String(label).trim()) return i + 2;
  }
  return -1;
}

// Return the 1-indexed column number of the current (rightmost non-empty header) semester
function getCurrentSemesterCol(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 2) return -1;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = headers.length - 1; i >= 1; i--) {
    if (headers[i] && String(headers[i]).trim() !== '') return i + 1;
  }
  return -1;
}

// Count unique students who checked in (pointsEarned > 0) on a given date
function countUniqueStudentsForDate(date) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Swipes');
  if (!sheet || sheet.getLastRow() < 4) return 0;
  var numRows = sheet.getLastRow() - 3;
  var data = sheet.getRange(4, 1, numRows, 4).getValues();
  var unique = {};
  for (var i = 0; i < data.length; i++) {
    var rowDate = formatDate(data[i][3]);
    var pts = Number(data[i][1]);
    var sid = String(data[i][0]).trim();
    if (rowDate === date && pts > 0 && sid.length === 9) {
      unique[sid] = true;
    }
  }
  return Object.keys(unique).length;
}

// Return the highest "Week N" number found in col A of the comparison sheet
function getMaxWeekNumber(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var labels = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var max = 0;
  for (var i = 0; i < labels.length; i++) {
    var match = String(labels[i][0]).match(/week\s*(\d+)/i);
    if (match) {
      var n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return max;
}

// Return the 1-indexed sheet row of the Total row, or -1 if none found
function getTotalRowIndex(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var labels = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < labels.length; i++) {
    if (/total|grand\s*total|sum/i.test(String(labels[i][0]).trim())) {
      return i + 2;
    }
  }
  return -1;
}

// ============================================================
// COMPARISON SHEET — MAIN UPDATE (called automatically on every check-in)
// ============================================================

function updateComparisonData(date) {
  if (!date) return { success: false, reason: 'No date provided' };

  var studentCount = countUniqueStudentsForDate(date);

  var compSheet = getComparisonSheet();
  if (!compSheet) return { error: 'Data Comparison sheet not found' };

  var currentSemCol = getCurrentSemesterCol(compSheet);
  if (currentSemCol === -1) return { error: 'Could not determine current semester column' };

  // Use ScriptProperties to remember date → week label (e.g. "2025-04-15" → "Week 32")
  var props = PropertiesService.getScriptProperties();
  var mapping = JSON.parse(props.getProperty('ttDateWeekMapping') || '{}');

  if (mapping[date]) {
    // Row for this date already exists — just update the count
    var existingRow = findRowByLabel(compSheet, mapping[date]);
    if (existingRow > 0) {
      compSheet.getRange(existingRow, currentSemCol).setValue(studentCount);
      return { success: true, action: 'updated', weekLabel: mapping[date], count: studentCount };
    }
    // Mapped row was deleted externally — fall through to insert a fresh one
    delete mapping[date];
  }

  // First time seeing this date — insert a new "Week N" row
  var nextWeek  = getMaxWeekNumber(compSheet) + 1;
  var weekLabel = 'Week ' + nextWeek;
  var totalRow  = getTotalRowIndex(compSheet);
  var insertAt;

  if (totalRow > 0) {
    compSheet.insertRowBefore(totalRow);
    insertAt = totalRow;          // total row shifted down; new row sits here
  } else {
    insertAt = compSheet.getLastRow() + 1;
  }

  compSheet.getRange(insertAt, 1).setValue(weekLabel);
  compSheet.getRange(insertAt, currentSemCol).setValue(studentCount);

  // Persist the date → weekLabel mapping
  mapping[date] = weekLabel;
  props.setProperty('ttDateWeekMapping', JSON.stringify(mapping));

  return { success: true, action: 'inserted', weekLabel: weekLabel, count: studentCount, row: insertAt };
}

// ============================================================
// COMPARISON SHEET — FULL SYNC (recalculates every date from Swipes)
// ============================================================

function syncAllComparisonData() {
  var swipesSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Swipes');
  if (!swipesSheet || swipesSheet.getLastRow() < 4) {
    return { success: true, processed: 0, reason: 'No swipes data found' };
  }

  var numRows = swipesSheet.getLastRow() - 3;
  var data = swipesSheet.getRange(4, 1, numRows, 4).getValues();

  // Collect every unique date that has at least one check-in
  var datesSet = {};
  for (var i = 0; i < data.length; i++) {
    var d   = formatDate(data[i][3]);
    var pts = Number(data[i][1]);
    var sid = String(data[i][0]).trim();
    if (d && pts > 0 && sid.length === 9) datesSet[d] = true;
  }

  var uniqueDates = Object.keys(datesSet).sort(); // chronological order
  var summary = [];

  for (var j = 0; j < uniqueDates.length; j++) {
    var res = updateComparisonData(uniqueDates[j]);
    summary.push({ date: uniqueDates[j], weekLabel: res.weekLabel || res.action, count: res.count });
  }

  return { success: true, processed: uniqueDates.length, summary: summary };
}

// ============================================================
// COMPARISON SHEET — READ (for charts page)
// ============================================================

function getComparisonData() {
  var sheet = getComparisonSheet();

  if (!sheet) {
    var allNames = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function(s) { return s.getName(); });
    return { error: 'Data Comparison sheet not found. Available sheets: ' + allNames.join(', ') };
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 2) return { headers: [], rows: [] };

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h); });
  var rawRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var rows = rawRows.map(function(row) {
    return row.map(function(cell) {
      if (cell instanceof Date) return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (cell === '' || cell === null || cell === undefined) return null;
      return cell;
    });
  }).filter(function(row) {
    return row.some(function(cell) { return cell !== null && cell !== ''; });
  });

  return { headers: headers, rows: rows };
}

// ============================================================
// INVENTORY
// ============================================================

function getInventory() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Inventory');
  if (!sheet || sheet.getLastRow() < 2) return [];
  var numRows = sheet.getLastRow() - 1;
  var data = sheet.getRange(2, 1, numRows, 5).getValues();
  return data.map(function(row) {
    return {
      category: String(row[0] || '').trim(),
      item: String(row[1] || '').trim(),
      quantity: Number(row[2]) || 0,
      location: String(row[3] || '').trim(),
      notes: String(row[4] || '').trim()
    };
  }).filter(function(i) { return i.item !== ''; });
}

// ============================================================
// HELPERS
// ============================================================

function copyFormulasToRow(sheet, targetRow) {
  var sourceRow = targetRow - 1;
  if (sourceRow < 4) return;

  var formulaCols = [5, 8, 9, 10, 11];

  for (var i = 0; i < formulaCols.length; i++) {
    var col = formulaCols[i];
    var sourceCell = sheet.getRange(sourceRow, col);
    var formula = sourceCell.getFormula();

    if (formula) {
      sourceCell.copyTo(sheet.getRange(targetRow, col), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    }
  }
}

function formatDate(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var str = String(value);
  if (str.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
    var parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  }
  if (str.includes('T')) return str.split('T')[0];
  return str;
}
