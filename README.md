# count-bot 简介
基于wechaty的统计微信群消息机器人

# 前提
1. Node.js 版本必须在v10或者以上
2. 本地系统平台必须要有构建工具

# 快速开始
0. Install Node.js (>=10)
1. Clone this Repository
    - git clone https://github.com/pauleric/count-bot.git
    - cd count-bot
2. Install Dependencies
    - npm install 
3. Run the Bot
    - node count-bot.js

# 功能
1. 微信登录时把二维码保存为图片，通过方糖推送登录提醒
2. 监控群消息自动保存到数据库，格式错误时自动提醒
3. 统计结果生成excel文件，并发送给指定用户

