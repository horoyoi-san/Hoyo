<div align="center">
<table>
<tr>
<td valign="center"><a href="MuipAPI.md"><img src="https://github.com/twitter/twemoji/blob/master/assets/72x72/1f1fa-1f1f8.png" width="16"/> English</a></td>
<td valign="center"><a href="MuipAPI_zh-CN.md"><img src="https://github.com/twitter/twemoji/blob/master/assets/72x72/1f1e8-1f1f3.png?raw=true" width="16"/> 简中</a></td>
<td valign="center"><a href="MuipAPI_zh-TW.md"><img src="https://github.com/twitter/twemoji/blob/master/assets/72x72/1f1f9-1f1fc.png?raw=true" width="16"/> 繁中</a></td>
<td valign="center"><img src="https://github.com/twitter/twemoji/blob/master/assets/72x72/1f1ef-1f1f5.png" width="16"/> 日本語</td>
</tr>
</table>
</div>

## 💡APIヘルプ

- バージョン2.3以降、外部API呼び出しをサポート
- 総インターフェースはDispatchインターフェースにエントリを加えたもので、例えばあなたのDispatchが http://127.0.0.1:8080 の場合、リクエストパラメータと返り値はjson形式です
- (1)セッション作成インターフェース: http://127.0.0.1:8080/muip/create_session (POSTサポート)
  - -オプションパラメータ：key_type (タイプ、PEMまたはデフォルトのXMLのみサポート)
  - -返り値の例：
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
- (2)認証インターフェース: http://127.0.0.1:8080/muip/auth_admin (POSTサポート)
  - -必須パラメータ1：SessionId (セッション作成インターフェースのリクエスト後に取得)
  - -必須パラメータ2：admin_key (config.jsonのMuipServer.AdminKey設定で、rsaPublicKey[セッション作成インターフェースで取得]下でRSA[pacs#1]暗号化)
  - -返り値の例：
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
- (3)コマンド送信インターフェース: http://127.0.0.1:8080/muip/exec_cmd (POST/GETサポート)
  - -必須パラメータ1：SessionId (セッション作成インターフェースのリクエスト後に取得)
  - -必須パラメータ2：Command (実行するコマンドはrsaPublicKey[セッション作成インターフェースで取得]下でRSA[pacs#1]暗号化)
  - -必須パラメータ3：TargetUid (コマンドを実行するプレイヤーのUID)
  - -返り値の例：
    ```json
    {
      "code": 0,
      "message": "Success",
      "data": {
          "sessionId": "***",
          "message": "*** //base64エンコード後
      }
    }
    ```
- (4)サーバー状態取得インターフェース: http://127.0.0.1:8080/muip/server_information (POST/GETサポート)
  - -必須パラメータ1：SessionId (セッション作成インターフェースのリクエスト後に取得)
  - -返り値の例：
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
- (5)プレイヤー情報取得インターフェース: http://127.0.0.1:8080/muip/player_information (POST/GETサポート)
  - -必須パラメータ1：SessionId (セッション作成インターフェースのリクエスト後に取得)
  - -必須パラメータ2：Uid (プレイヤーUID)
  - -返り値の例：
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
