const { 
  Wechaty,
  Room,
  Message,
} = require('wechaty')

const finis = require('finis')
const sd = require('silly-datetime')
const fs = require('fs')
const https = require('https');
const SqliteDB = require('./sqlite.js').SqliteDB;
const ejsexcel = require("ejsexcel");
const util = require("util");
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const { FileBox }  = require('file-box')

const databasefile = "workcount.db";
 
const sqliteDB = new SqliteDB(databasefile);

const bot = new Wechaty()

bot.on('scan',    onScan)
bot.on('login',   onLogin)
bot.on('logout',  onLogout)
bot.on('message', onMessage)

const createWorkTotalTableSql = "create table if not exists worktotal(workid INTEGER, userid TEXT, username TEXT, totalnum INTEGER, curnum INTEGER, reporttime TEXT, reportstr TEXT, verify TEXT);"; 
//const createWorkDiaryTableSql = "create table if not exists workdiary(workid INTEGER, userid TEXT, username TEXT, reportdate TEXT, totalnum INTEGER);"; 
const createWorkDetailTableSql = "create table if not exists workdetail(workid INTEGER, userid TEXT, username TEXT, totalnum INTEGER, curnum INTEGER, reporttime TEXT, reportstr TEXT, verify TEXT);"; 
sqliteDB.createTable(createWorkTotalTableSql);
//sqliteDB.createTable(createWorkDiaryTableSql);
sqliteDB.createTable(createWorkDetailTableSql);

bot.start()
.then(() => console.log('Starter Bot Started.'))
.catch(e => console.error(e))


function onScan (qrcode, status) {
	require('qrcode-terminal').generate(qrcode, { small: true })  // show qrcode on console
	logger.info(qrcode + 'status:' + status)
  //   downloadurl(qrcode, '/home/downloads/wechat.jpg', function(){
  // 	logger.info('qrcode create finish');
  //   });
	const qr_png = qr.image(qrcode, { type: 'png' });
	qr_png.pipe(fs.createWriteStream('/home/downloads/wechat.png'));
  
	const qrcodeImageUrl = [
	  'https://api.qrserver.com/v1/create-qr-code/?data=',
	  encodeURIComponent(qrcode),
	].join('')
  
	logger.info(qrcodeImageUrl)
	
	 const ftqqUrl = [
	  'https://sc.ftqq.com/SCU34483Teb2475db9d046eb7a6d084e63902fe905bcd3e83cbea9.send?text=',
	  encodeURIComponent('<a href=https://api.qrserver.com/v1/create-qr-code/?data='+qrcode+'>二维码</a><a href=http://47.105.59.253/downloads/wechat.png>二维码图片</a>'),
	 ].join('')
	
	if (status == 1) {
	  const curdate=new Date()
	  if (curdate.getHours() > 6 && curdate.getHours() < 23)	{
		  https.get(ftqqUrl, (res) => {
			  console.log(`Got response: ${res.statusCode}`);
			  // consume response body
			  res.resume();
		  }).on('error', (e) => {
			  console.log(`Got error: ${e.message}`);
		  });   
	  }	  
	}
}

function onLogin (user) {
  console.log(`${user} login`)
}

function onLogout(user) {
  console.log(`${user} logout`)
}

async function onMessage (msg) {
  const room = msg.room()
  const from = msg.from()
  const text = msg.text()

  if (!from) {
    return
  }
  const fromname = from.name()
  if (msg.type() === Message.Type.Text) {
	  if(room) {
		roomtopic = await room.topic()
		if (roomtopic.indexOf('消息测试') > -1) {
			if (text.length < 100) 
				workreport(roomtopic, fromname, text, 1, false)
		} else 	if (roomtopic.indexOf('小程序') == 0) {
			if (text == 'get111') {
				exportexcel(1, msg)							
			} else if (text == 'check111') {
				exportdebug(1, msg)		
			} else {
				if (text.length < 100) 
					workreport(roomtopic, fromname, text, 1, true)				
			}
		}
	  } else {
		if (fromname == 'paul')  {
			if (text == 'get111') {
				exportexcel(1, msg)				
			} else if (text == 'textdebug') {
				exporttextdebug(1)
			} else if (text == 'check111') {
				exportdebug(1, msg)		
			} else if (text == 'testmsg') {
				selftestmsg()		
			} else {
				if (text.length < 100) 
					workreport('yugs', fromname, text, 1, true)
			}
		}
	  }
  } else {
	if (fromname == 'paul') {
		const file = await msg.toFileBox()
		const name = file.name
		console.log('Save file to: ' + name)
		file.toFile(fromname + '/' + name)
	}
  }  
}

function match (str, keywords) {
  str = String(str)
  var ks = ''
  if (Array.isArray(keywords)) {
    ks = keywords.map(k => '\\d+' + k).join('|') + '|'
  } else if (typeof keywords === 'string') {
    ks = `\\d+${keywords}|`
  }
  var checker = new RegExp(`${ks}\\d+|\\D+`, 'g')
  return str.match(checker)
}

function addZero(num, length) {  
    return (Array(length).join('0') + num).slice(-length);  
}  

async function sendverifytoroom(verifystr) {
	const room = await bot.Room.find({ topic: /^小程序/ })
	if (room) {
		room.say(verifystr)
	} else {
		console.log('room not find');		
	}	
}

function workreport(roomtopic, fromname, text, workid, root) {
	const curtime=sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
	var reportstr = text.replace(/(<br[^>]*>|\s*)/g,'')
	reportstr = reportstr.replace(/o/gi, '0');
	var reportarr = match(reportstr)
	
	var matchsucess = false
	
	if (reportarr.length == 6) {
		if (!isNaN(reportarr[0]) && !isNaN(reportarr[2]) && !isNaN(reportarr[4]) &&
			isNaN(reportarr[1]) && isNaN(reportarr[3]) && isNaN(reportarr[5])) {
			console.log(curtime + ':[' + roomtopic + ']' + '<' + fromname + '>' + ':' + text)	
			matchsucess = true
		}
	} 
	
	const curdate=sd.format(new Date(), 'YYYY-MM-DD');
	if (matchsucess) {	
		
		fs.appendFileSync(roomtopic + '/' + curdate + '_sucess.txt', curtime + '   ' + text +'\r\n');
		reportarr[0] = addZero(reportarr[0], 3)
		var workdetail = []
		workdetail.push(workid)
		workdetail.push(reportarr[0])
		workdetail.push(reportarr[1])
		workdetail.push(reportarr[2])
		workdetail.push(reportarr[4])
		if (!root)
			workdetail.push(curtime)	
		else
			workdetail.push('')	
		workdetail.push(reportstr)  
		
		var querySql = 'select workid, userid, username, totalnum, curnum, reporttime, reportstr, verify from worktotal where workid = '+workid+' and userid ="' +reportarr[0]+ '";';
		sqliteDB.queryDataMore(querySql, dataDealMore, workdetail);
	} else {
		if (!root && reportarr.length > 1 ) {
			if (!isNaN(reportarr[0]) && isNaN(reportarr[1])) {
				console.log(curtime + ':[' + roomtopic + ']' + '<' + fromname + '>' + ':' + text)
				if (reportarr.length > 2 && reportarr[0].length == 3 && reportarr[1].length < 10) {						
					fs.appendFileSync(roomtopic + '/' + curdate + '_failed.txt', curtime + ':' + text +'\r\n');
					console.log(reportarr)	
				
					sendverifytoroom('格式错误：'+ text)
				}
			}
		}		
	}
}

function dataDealMore(objects, workdetail){
	var verifyinfo = ''
	var verifylog = 'sucess'
	var curtotalnum = parseInt(workdetail[3])
	var curdiarynum = parseInt(workdetail[4])

    if (objects.length > 0) {
		var updateSql = ''
		if (workdetail[5] != '') {
			if (curtotalnum == objects[0].totalnum + curdiarynum) {
				workdetail.push('')
				var priornum = parseInt(objects[0].curnum)
				if (priornum > 0) {
					workdetail[4] = String(priornum + curdiarynum)
					console.log('add prior num:' + objects[0].curnum);	
				}
				
				if (objects[0].verify.length > 0 && (objects[0].verify.indexOf('上次报数') == 0 || objects[0].verify.indexOf('第一次报数') == 0)) {
					verifylog = '已修改：' + workdetail[6]	+ ' 需确认：' + objects[0].reportstr+ ' ' +objects[0].verify 
					verifyinfo = verifylog
				}
			} else {
				var expectnum = objects[0].totalnum + curdiarynum
				verifylog = '上次报数' + objects[0].totalnum + ',正常累计' + expectnum
				workdetail[3] = objects[0].totalnum
				workdetail[4] = objects[0].curnum
				workdetail.push(verifylog)
				verifyinfo = '需确认：'+ workdetail[6] + ' ' + verifylog
			}
			updateSql = 'update worktotal set username = "'+workdetail[2]+'",totalnum = '+workdetail[3]+',curnum = '+workdetail[4]+',reporttime = "'+workdetail[5]+'",reportstr = "'+workdetail[6]+'",verify = "'+workdetail[7]+'" where workid = '+workdetail[0]+' and userid ="' +workdetail[1]+ '"';
		} else {
			verifylog = 'root verify'
			workdetail.push(workdetail[6])
			updateSql = 'update worktotal set username = "'+workdetail[2]+'",totalnum = '+workdetail[3]+',curnum = '+workdetail[4]+',verify = "'+workdetail[7]+'" where workid = '+workdetail[0]+' and userid ="' +workdetail[1]+ '"';			
		}
		sqliteDB.executeSql(updateSql);		
	} else {
		var insertTotalSql = ''
		if (workdetail[5] != '') {
			if (curtotalnum == curdiarynum) {
				workdetail.push('')
			} else {
				verifylog = '第一次报数，总数和当日不匹配'
				workdetail[3] = 0
				workdetail[4] = 0
				workdetail.push(verifylog)
				verifyinfo = '需确认：'+ workdetail[6] + ' ' + verifylog
			}
			insertTotalSql = "insert into worktotal(workid, userid, username, totalnum, curnum, reporttime, reportstr, verify) values(?, ?, ?, ?, ?, ?, ?, ?)";
		} else {
			verifylog = 'root verify'
			const curtime=sd.format(new Date(), 'YYYY-MM-DD HH:mm:ss');
			workdetail[5] = curtime
			workdetail.push('')
			insertTotalSql = "insert into worktotal(workid, userid, username, totalnum, curnum, reporttime, reportstr, verify) values(?, ?, ?, ?, ?, ?, ?, ?)";	
		}
		
		sqliteDB.insertData(insertTotalSql, workdetail);		
	}

	var insertDetailSql = "insert into workdetail(workid, userid, username, totalnum, curnum, reporttime, reportstr, verify) values(?, ?, ?, ?, ?, ?, ?, ?)";
	sqliteDB.insertData(insertDetailSql, workdetail); 	
	
	console.log('verify result:' + verifylog);	
	if (verifyinfo.length > 0) {
		sendverifytoroom(verifyinfo)
	} 
}

async function selftestmsg(){
	const room = await bot.Room.find({ topic: /^小程序/ })
	if (room) {
		room.say('测试消息')
	} else {
		console.log('room not find');		
	}	
}

function exportexcel(workid, msg){
	const querySql = "select userid, username, totalnum, case curnum when 0 then '' else curnum end curnum, reporttime, reportstr,verify  from worktotal where workid = "+workid+" and totalnum > 0 order by userid";
	sqliteDB.queryDataMore(querySql, dataDeal, msg);	

	const updateSql = 'update worktotal set curnum = 0 where workid = '+workid;

	sqliteDB.executeSql(updateSql);	
	console.log(updateSql)	
}

async function dataDeal(objects, msg){
	const curdate=sd.format(new Date(), 'YY.MM.DD');
	const exlBuf = await readFileAsync("reportexcel/reporttemplate.xlsx");
	var data = [[{"curdate":curdate}]]
	data.push(objects)
	const exlBuf2 = await ejsexcel.renderExcel(exlBuf, data);
	const filepath = "reportexcel/" + curdate + ".xlsx"
	await writeFileAsync(filepath, exlBuf2);
	console.log(filepath + ".xlsx生成完成"); 
	
	const fileBox = FileBox.fromFile(filepath)

	await msg.say(fileBox)
	console.log('REPLY: %s', fileBox.toString())
}

function exportdebug(workid, msg){
	const querySql = "select userid, username, totalnum, case curnum when 0 then '' else curnum end curnum, reporttime, reportstr,verify from worktotal where workid = "+workid+" order by reporttime";
	sqliteDB.queryDataMore(querySql, dataDealDebug, msg);		
}

async function dataDealDebug(objects, msg){
	const curdate=sd.format(new Date(), 'YY.MM.DD');
	const exlBuf = await readFileAsync("reportexcel/reporttemplate.xlsx");
	var data = [[{"curdate":curdate}]]
	data.push(objects)
	const exlBuf2 = await ejsexcel.renderExcel(exlBuf, data);
	const filepath = "reportexcel/" + curdate + "_debug.xlsx"
	await writeFileAsync(filepath, exlBuf2);
	console.log(filepath + ".xlsx生成完成"); 
	
	const fileBox = FileBox.fromFile(filepath)

	await msg.say(fileBox)
	console.log('REPLY: %s', fileBox.toString())
}

function exporttextdebug(workid){
	const querySql = 'select  userid, username, reporttime, reportstr from worktotal where workid = '+workid+' order by reporttime desc';
	sqliteDB.queryData(querySql, datadebug);		
}


async function datadebug(objects){
	const curdate=sd.format(new Date(), 'YYYY-MM-DD');
    for(var i = 0; i < objects.length; ++i){
        fs.appendFileSync('debug/' + curdate + '_debug.txt', objects[i].reporttime + ' ' + objects[i].reportstr + ' ' + objects[i].userid +'\r\n');
    }
	console.log('datadebug finish')
}

finis((code, signal, error) => {
  console.log('sqliteDB close.')
  sqliteDB.close();
  // await bot.stop()
  bot.stop()
  console.log(`Wechaty exit ${code} because of ${signal}/${error})`)
  process.exit(1)
})
