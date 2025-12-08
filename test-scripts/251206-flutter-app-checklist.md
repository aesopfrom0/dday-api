# Flutter 앱 푸시 알림 체크리스트

Flutter 앱에서 푸시 알림을 받기 위해 확인해야 할 사항과 디버깅 방법을 안내합니다.

## 🎯 1단계: 푸시 권한 확인

### 1.1 iOS 설정에서 확인
1. **설정** 앱 열기
2. 아래로 스크롤하여 **[앱 이름]** 찾기
3. **알림** 탭 선택
4. 다음 항목이 켜져 있는지 확인:
   - [ ] **알림 허용** - ON
   - [ ] **잠금 화면** - ON (선택사항)
   - [ ] **알림 센터** - ON (선택사항)
   - [ ] **배너** - ON (선택사항)
   - [ ] **소리** - ON (선택사항)

### 1.2 Flutter 코드에서 권한 상태 확인

앱에 다음 코드를 추가하여 현재 푸시 권한 상태를 확인하세요:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

Future<void> checkNotificationPermission() async {
  final messaging = FirebaseMessaging.instance;

  // 현재 권한 상태 확인
  final settings = await messaging.getNotificationSettings();

  print('🔔 푸시 알림 권한 상태: ${settings.authorizationStatus}');

  switch (settings.authorizationStatus) {
    case AuthorizationStatus.authorized:
      print('✅ 권한 허용됨 (authorized)');
      break;
    case AuthorizationStatus.provisional:
      print('⚠️  임시 권한 (provisional) - iOS 12+ 조용한 알림');
      break;
    case AuthorizationStatus.denied:
      print('❌ 권한 거부됨 (denied)');
      break;
    case AuthorizationStatus.notDetermined:
      print('⏸️  권한 요청 안됨 (notDetermined)');
      break;
  }

  // 알림 타입별 상태
  print('🔔 Alert: ${settings.alert}');
  print('🔔 Badge: ${settings.badge}');
  print('🔔 Sound: ${settings.sound}');
}
```

**사용 시점**:
- 앱 시작 시 (`main()` 또는 `initState()`)
- 설정 화면에서 권한 상태 표시용

### 1.3 권한 요청 코드

권한이 없는 경우 요청하는 코드:

```dart
Future<void> requestNotificationPermission() async {
  final messaging = FirebaseMessaging.instance;

  print('🔔 푸시 알림 권한 요청 중...');

  final settings = await messaging.requestPermission(
    alert: true,
    badge: true,
    sound: true,
    provisional: false, // true로 하면 조용한 알림 (권한 팝업 안뜸)
  );

  if (settings.authorizationStatus == AuthorizationStatus.authorized) {
    print('✅ 사용자가 권한을 허용했습니다.');
  } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
    print('⚠️  임시 권한이 부여되었습니다.');
  } else {
    print('❌ 사용자가 권한을 거부했습니다.');
  }
}
```

**주의사항**:
- iOS에서는 권한 팝업이 **딱 1번**만 표시됩니다
- 거부 후 재요청하면 아무 일도 일어나지 않습니다
- 권한 변경은 **설정 앱**에서만 가능합니다

## 🎯 2단계: FCM 토큰 발급 및 서버 전송 확인

### 2.1 FCM 토큰 발급

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

Future<String?> getFCMToken() async {
  try {
    final messaging = FirebaseMessaging.instance;
    final token = await messaging.getToken();

    if (token != null) {
      print('✅ FCM 토큰 발급 성공:');
      print('📱 Token: ${token.substring(0, 20)}...');
      return token;
    } else {
      print('❌ FCM 토큰 발급 실패');
      return null;
    }
  } catch (e) {
    print('❌ FCM 토큰 발급 에러: $e');
    return null;
  }
}
```

### 2.2 서버에 FCM 토큰 전송

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> registerFCMToken(String token) async {
  try {
    final url = Uri.parse('${API_BASE_URL}/users/fcm-token');

    print('📤 서버에 FCM 토큰 등록 중...');

    final response = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $jwtToken', // JWT 토큰 필요
      },
      body: json.encode({
        'token': token,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      print('✅ FCM 토큰 서버 등록 성공');
    } else {
      print('❌ FCM 토큰 서버 등록 실패: ${response.statusCode}');
      print('응답: ${response.body}');
    }
  } catch (e) {
    print('❌ FCM 토큰 서버 전송 에러: $e');
  }
}
```

### 2.3 토큰 갱신 리스너 등록

FCM 토큰은 앱 재설치, 데이터 삭제 등의 이유로 변경될 수 있습니다:

```dart
void setupTokenRefreshListener() {
  FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
    print('🔄 FCM 토큰이 갱신되었습니다.');
    print('📱 New Token: ${newToken.substring(0, 20)}...');

    // 서버에 새 토큰 등록
    registerFCMToken(newToken);
  });
}
```

### 2.4 통합 초기화 코드

앱 시작 시 한 번만 실행:

```dart
Future<void> initializePushNotifications() async {
  print('🚀 푸시 알림 초기화 시작...\n');

  // 1. 권한 확인
  await checkNotificationPermission();

  // 2. 권한 요청 (필요시)
  final settings = await FirebaseMessaging.instance.getNotificationSettings();
  if (settings.authorizationStatus == AuthorizationStatus.notDetermined) {
    await requestNotificationPermission();
  }

  // 3. FCM 토큰 발급
  final token = await getFCMToken();

  // 4. 서버에 토큰 전송
  if (token != null) {
    await registerFCMToken(token);
  }

  // 5. 토큰 갱신 리스너 등록
  setupTokenRefreshListener();

  // 6. 포그라운드 메시지 리스너 등록
  setupForegroundMessageListener();

  print('\n✅ 푸시 알림 초기화 완료');
}
```

## 🎯 3단계: 메시지 수신 리스너 설정

### 3.1 포그라운드 메시지 (앱 실행 중)

```dart
void setupForegroundMessageListener() {
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('📬 포그라운드 메시지 수신:');
    print('   제목: ${message.notification?.title}');
    print('   내용: ${message.notification?.body}');
    print('   데이터: ${message.data}');

    // 포그라운드에서도 알림 표시하려면
    // flutter_local_notifications 패키지 사용 필요
    _showLocalNotification(message);
  });
}

void _showLocalNotification(RemoteMessage message) {
  // flutter_local_notifications 패키지를 사용하여
  // 포그라운드에서도 알림 배너 표시
  // (구현 필요)
}
```

### 3.2 백그라운드/종료 상태 메시지

**main.dart 파일의 최상위(top-level)에 추가**:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

// main() 함수 밖에 위치해야 함!
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase 초기화 (백그라운드에서도 필요)
  await Firebase.initializeApp();

  print('📬 백그라운드 메시지 수신:');
  print('   제목: ${message.notification?.title}');
  print('   내용: ${message.notification?.body}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // 백그라운드 메시지 핸들러 등록
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  runApp(MyApp());
}
```

### 3.3 알림 클릭 이벤트

```dart
void setupNotificationTapListener() {
  // 앱이 백그라운드 상태에서 알림 클릭
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    print('🖱️ 백그라운드 알림 클릭:');
    print('   데이터: ${message.data}');

    // 특정 화면으로 이동
    _navigateToScreen(message.data);
  });

  // 앱이 종료 상태에서 알림으로 실행됨
  FirebaseMessaging.instance.getInitialMessage().then((message) {
    if (message != null) {
      print('🖱️ 종료 상태에서 알림으로 앱 실행:');
      print('   데이터: ${message.data}');

      _navigateToScreen(message.data);
    }
  });
}

void _navigateToScreen(Map<String, dynamic> data) {
  // data['occasionId'] 등을 사용하여 특정 화면으로 이동
  // Navigator.push(...) 구현
}
```

## 🎯 4단계: 디버깅 페이지 추가 (권장)

개발 중에 푸시 상태를 쉽게 확인할 수 있는 페이지를 추가하세요:

```dart
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class PushNotificationDebugPage extends StatefulWidget {
  @override
  _PushNotificationDebugPageState createState() =>
      _PushNotificationDebugPageState();
}

class _PushNotificationDebugPageState extends State<PushNotificationDebugPage> {
  String _permissionStatus = '확인 중...';
  String _fcmToken = '확인 중...';
  bool _isRegistered = false;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  Future<void> _checkStatus() async {
    // 권한 상태
    final settings = await FirebaseMessaging.instance.getNotificationSettings();
    setState(() {
      _permissionStatus = settings.authorizationStatus.toString();
    });

    // FCM 토큰
    final token = await FirebaseMessaging.instance.getToken();
    setState(() {
      _fcmToken = token ?? '없음';
    });
  }

  Future<void> _requestPermission() async {
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    await _checkStatus();
  }

  Future<void> _registerToken() async {
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      // 서버에 토큰 전송
      await registerFCMToken(token);
      setState(() {
        _isRegistered = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('푸시 알림 디버그')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('📋 권한 상태', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text(_permissionStatus),
            SizedBox(height: 16),

            ElevatedButton(
              onPressed: _requestPermission,
              child: Text('권한 요청'),
            ),

            Divider(height: 32),

            Text('📱 FCM 토큰', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            SelectableText(_fcmToken, style: TextStyle(fontSize: 12)),
            SizedBox(height: 16),

            ElevatedButton(
              onPressed: _registerToken,
              child: Text('서버에 토큰 등록'),
            ),

            if (_isRegistered)
              Padding(
                padding: EdgeInsets.only(top: 8),
                child: Text('✅ 등록 완료', style: TextStyle(color: Colors.green)),
              ),

            Divider(height: 32),

            Text('💡 팁', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text('• 권한 거부 후 재요청은 설정 앱에서만 가능'),
            Text('• 포그라운드에서는 알림 배너가 표시되지 않음'),
            Text('• TestFlight는 Production 환경 (APNs Production 인증서 필요)'),
          ],
        ),
      ),
    );
  }
}
```

## 🎯 5단계: Xcode 설정 확인

### 5.1 Push Notifications Capability
1. Xcode에서 프로젝트 열기
2. **Target** 선택 → **Signing & Capabilities** 탭
3. **+ Capability** 클릭
4. **Push Notifications** 추가
5. 다음 항목이 있는지 확인:
   - [ ] Push Notifications
   - [ ] Background Modes → Remote notifications 체크

### 5.2 GoogleService-Info.plist
1. `ios/Runner/GoogleService-Info.plist` 파일 확인
2. Firebase Console에서 다운로드한 파일과 일치하는지 확인
3. Bundle Identifier가 프로젝트와 일치하는지 확인

## 🎯 6단계: 문제별 해결 방법

### ❌ 권한이 거부되었어요
**원인**: 사용자가 권한 팝업에서 "허용 안 함" 선택

**해결**:
1. iOS **설정** 앱 → [앱] → 알림 → 켜기
2. 코드에서는 권한 재요청 불가 (설정으로 유도해야 함)

```dart
void openAppSettings() {
  // app_settings 패키지 사용
  AppSettings.openAppSettings();
}
```

### ❌ FCM 토큰이 null이에요
**원인**:
- 권한이 없음
- Firebase 초기화 안됨
- 네트워크 연결 안됨

**해결**:
1. 권한 먼저 확인 및 요청
2. `Firebase.initializeApp()` 호출 확인
3. 인터넷 연결 확인

### ❌ 서버에 토큰 전송이 실패해요
**원인**:
- JWT 토큰 없음 또는 만료
- API 엔드포인트 URL 오류
- 네트워크 에러

**해결**:
1. 로그인 후 JWT 토큰 확보
2. API URL 확인: `POST /users/fcm-token`
3. 응답 코드 확인 (401, 403, 500 등)

### ❌ 포그라운드에서 알림이 안 보여요
**정상**: iOS는 기본적으로 포그라운드에서 알림 배너를 표시하지 않습니다.

**해결**: `flutter_local_notifications` 패키지 사용

```yaml
dependencies:
  flutter_local_notifications: ^17.0.0
```

```dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

void setupForegroundNotification() {
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    flutterLocalNotificationsPlugin.show(
      message.hashCode,
      message.notification?.title,
      message.notification?.body,
      NotificationDetails(
        iOS: DarwinNotificationDetails(),
      ),
    );
  });
}
```

### ❌ TestFlight에서만 알림이 안 와요
**원인**: Firebase에 APNs Production 인증서가 없음

**해결**: `test-scripts/251206-firebase-setup-guide.md` 참고

## 🎯 7단계: 통합 체크리스트

앱에서 푸시 알림을 받으려면:

- [ ] **Firebase 초기화**: `Firebase.initializeApp()` 호출
- [ ] **권한 요청**: `FirebaseMessaging.instance.requestPermission()`
- [ ] **권한 확인**: iOS 설정 → [앱] → 알림 → 허용
- [ ] **FCM 토큰 발급**: `getToken()` 성공
- [ ] **서버에 토큰 전송**: `POST /users/fcm-token` 성공
- [ ] **Xcode Capability**: Push Notifications, Background Modes 추가
- [ ] **Firebase Console**: APNs Production 인증서 등록 (TestFlight용)
- [ ] **메시지 리스너**: `onMessage`, `onBackgroundMessage` 등록

## 📱 테스트 방법

### 1. 테스트 알림 발송 (서버에서)
```bash
export JWT_TOKEN="your_token"
export OCCASION_ID="occasion_id"
node test-scripts/251206-test-push-notification.js
```

### 2. 디바이스 상태 확인
- 앱을 백그라운드로 보내기 (홈 버튼 또는 스와이프)
- 테스트 알림 발송
- 알림 배너가 표시되는지 확인

### 3. 로그 확인
```dart
// 앱 콘솔에서 확인할 로그
✅ Firebase Admin initialized
✅ FCM 토큰 발급 성공
✅ FCM 토큰 서버 등록 성공
📬 포그라운드 메시지 수신 (앱 실행 중인 경우)
```

## 🔗 참고 자료

- [Firebase Messaging Flutter](https://firebase.flutter.dev/docs/messaging/overview)
- [Apple Push Notifications](https://developer.apple.com/notifications/)
- [flutter_local_notifications](https://pub.dev/packages/flutter_local_notifications)
