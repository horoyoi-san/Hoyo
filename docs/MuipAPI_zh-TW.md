<div align="center">
<table>
<tr>
<td valign="center"><a href="MuipAPI.md"><img src="https://github.com/twitter/twemoji/blob/master/assets/72x72/1f1fa-1f1f8.png" width="16"/> English</a></td>
<td valign="center"><a href="MuipAPI_zh-CN.md"><img src="https://github.com/twitter/twemoji/blob/master/assets/72x72/1f1e8-1f1f3.png?raw=true" width="16"/> 简中</a></td>
<td valign="center"><img src="https://github.com/twitter/twemoji/blob/master/assets/72x72/1f1f9-1f1fc.png?raw=true" width="16"/> 繁中</td>
<td valign="center"><a href="MuipAPI_ja-JP.md"><img src="https://github.com/twitter/twemoji/blob/master/assets/72x72/1f1ef-1f1f5.png" width="16"/> 日本語</a></td>
</tr>
</table>
</div>

## 💡API幫助

- 自2.3版本開始，支持外部API調用接口
- 總接口為Dispatch接口加上入口，比如你的Dispatch為 http://127.0.0.1:8080 ，請求參數和返回都為json格式
- (1)創建會話接口: http://127.0.0.1:8080/muip/create_session (支持POST)
  - -可選參數：key_type (類型，僅支持PEM或默認XML)
  - -返回示例：
  ```json
  {
    "code": 0,
    "message": "Created!",
    "data": {
        "rsaPublicKey": "***",
        "sessionId": "***",
        "expireTimeStamp": ***
    }
  }
  ```
- (2)授權接口: http://127.0.0.1:8080/muip/auth_admin (支持POST)
  - -必傳參數1：SessionId (在創建會話接口請求後獲得)
  - -必傳參數2：admin_key (在config.json的MuipServer.AdminKey配置，並且經過rsaPublicKey[創建會話接口獲取]下RSA[pacs#1]加密)
  - -返回示例：
  ```json
  {
    "code": 0,
    "message": "Authorized admin key successfully!",
    "data": {
        "sessionId": "***",
        "expireTimeStamp": ***
    }
  }
  ```
- (3)提交命令接口: http://127.0.0.1:8080/muip/exec_cmd (支持POST/GET)
  - -必傳參數1：SessionId (在創建會話接口請求後獲得)
  - -必傳參數2：Command (需要執行的命令經過rsaPublicKey[創建會話接口獲取]下RSA[pacs#1]加密)
  - -必傳參數3：TargetUid (執行命令的玩家UID)
  - -返回示例：
    ```json
    {
      "code": 0,
      "message": "Success",
      "data": {
          "sessionId": "***",
          "message": "*** //base64編碼後
      }
    }
    ```
- (4)獲取伺服器狀態接口: http://127.0.0.1:8080/muip/server_information (支持POST/GET)
  - -必傳參數1：SessionId (在創建會話接口請求後獲得)
  - -返回示例：
   ```json
    {
      "code": 0,
      "message": "Success",
      "data": {
          "onlinePlayers": [
              {
                  "uid": 10001,
                  "name": "KEVIN",
                  "headIconId": 208001
              },
              ....
          ],
          "serverTime": 1720626191,
          "maxMemory": 16002.227,
          "usedMemory": 7938.5547,
         "programUsedMemory": 323
      }
    }
    ```
- (5)獲取玩家信息接口: http://127.0.0.1:8080/muip/player_information (支持POST/GET)
  - -必傳參數1：SessionId (在創建會話接口請求後獲得)
  - -必傳參數2：Uid (玩家UID)
  - -返回示例：
   ```json
    {
      "code": 0,
      "message": "Success",
      "data": {
          "uid": 10001,
          "name": "KEVIN",
          "signature": "",
          "headIconId": 208001,
          "curPlaneId": 10001,
          "curFloorId": 10001001,
          "playerStatus": "Explore",
          "stamina": 182,
          "recoveryStamina": 4,
          "assistAvatarList": Array[0],
          "displayAvatarList": Array[0],
          "finishedMainMissionIdList": Array[38],
          "finishedSubMissionIdList": Array[273],
          "acceptedMainMissionIdList": Array[67],
          "acceptedSubMissionIdList": Array[169]
      }
  }
  ```
