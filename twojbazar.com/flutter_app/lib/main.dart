import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TwojBazarApp());
}

const String _appHost = 'twojbazar.com';
const String _wwwAppHost = 'www.twojbazar.com';
const String _initialUrl = 'https://twojbazar.com/#start';
const Color _brandNavy = Color(0xFF101827);
const Color _brandNavySoft = Color(0xFF132033);
const Color _brandOrange = Color(0xFFFF7A1A);
const Color _brandTeal = Color(0xFF21C7B7);
const Color _appCanvas = Color(0xFFFFF7ED);
const Map<_QuickDestination, String> _quickRoutes = {
  _QuickDestination.home: 'https://twojbazar.com/#start',
  _QuickDestination.add: 'https://twojbazar.com/add-listing.html',
  _QuickDestination.addAi:
      'https://twojbazar.com/add-listing.html?mode=ai#ai-quick-start',
};

enum _QuickDestination {
  home,
  add,
  addAi,
}

class TwojBazarApp extends StatelessWidget {
  const TwojBazarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TwojBazar',
      debugShowCheckedModeBanner: false,
      theme: _buildAppTheme(Brightness.light),
      darkTheme: _buildAppTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: const TwojBazarWebViewPage(),
    );
  }
}

ThemeData _buildAppTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final shellColor = isDark ? _brandNavy : _appCanvas;
  final appBarColor = isDark ? _brandNavySoft : const Color(0xFFFFF3DF);
  final foregroundColor = isDark ? Colors.white : const Color(0xFF172026);

  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: _brandTeal,
      brightness: brightness,
    ).copyWith(
      primary: _brandTeal,
      secondary: _brandOrange,
      surface: isDark ? _brandNavySoft : Colors.white,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: foregroundColor,
    ),
    scaffoldBackgroundColor: shellColor,
    appBarTheme: AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: appBarColor,
      foregroundColor: foregroundColor,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(
        color: foregroundColor,
        fontSize: 18,
        fontWeight: FontWeight.w800,
      ),
      iconTheme: IconThemeData(color: foregroundColor),
      actionsIconTheme: IconThemeData(color: foregroundColor),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: _brandOrange,
      linearTrackColor: Color(0x3321C7B7),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: _brandOrange,
        foregroundColor: Colors.white,
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(foregroundColor: foregroundColor),
    ),
    useMaterial3: true,
  );
}

class TwojBazarWebViewPage extends StatefulWidget {
  const TwojBazarWebViewPage({super.key});

  @override
  State<TwojBazarWebViewPage> createState() => _TwojBazarWebViewPageState();
}

class _TwojBazarWebViewPageState extends State<TwojBazarWebViewPage> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  String _currentUrl = _initialUrl;
  bool _canGoBack = false;
  bool _canGoForward = false;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(_appCanvas)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) {
              return;
            }
            setState(() {
              _isLoading = true;
              _hasError = false;
              _errorMessage = '';
            });
          },
          onPageFinished: (_) {
            _syncNavigationState();
            if (!mounted) {
              return;
            }
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (error) {
            if (!mounted) {
              return;
            }
            setState(() {
              _isLoading = false;
              _hasError = true;
              _errorMessage = error.description;
            });
          },
          onNavigationRequest: (request) async {
            final uri = Uri.tryParse(request.url);

            if (uri == null) {
              return NavigationDecision.prevent;
            }

            _currentUrl = request.url;

            final scheme = uri.scheme.toLowerCase();
            final host = uri.host.toLowerCase();

            if (_shouldStayInWebView(scheme, host)) {
              return NavigationDecision.navigate;
            }

            if (await canLaunchUrl(uri)) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }

            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadRequest(Uri.parse(_initialUrl));
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final isDark = MediaQuery.of(context).platformBrightness == Brightness.dark;
    _controller.setBackgroundColor(isDark ? _brandNavy : _appCanvas);
  }

  bool _shouldStayInWebView(String scheme, String host) {
    if (const {'file', 'about', 'data', 'javascript'}.contains(scheme)) {
      return true;
    }

    if (scheme == 'http' || scheme == 'https') {
      return host == _appHost || host == _wwwAppHost || host.isEmpty;
    }

    return false;
  }

  Future<void> _syncNavigationState() async {
    final canGoBack = await _controller.canGoBack();
    final canGoForward = await _controller.canGoForward();
    final currentUrl = await _controller.currentUrl() ?? _currentUrl;

    if (!mounted) {
      return;
    }

    setState(() {
      _canGoBack = canGoBack;
      _canGoForward = canGoForward;
      _currentUrl = currentUrl;
    });
  }

  Future<bool> _handleBackPressed() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      await _syncNavigationState();
      return false;
    }
    return true;
  }

  Future<void> _reload() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = '';
    });
    await _controller.reload();
  }

  Future<void> _openQuickDestination(_QuickDestination destination) async {
    final url = _quickRoutes[destination];
    if (url == null) {
      return;
    }

    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = '';
    });

    await _controller.loadRequest(Uri.parse(url));
  }

  String get _appBarTitle {
    if (_currentUrl.contains('add-listing.html') &&
        _currentUrl.contains('mode=ai')) {
      return 'Dodaj z AI';
    }
    if (_currentUrl.contains('add-listing.html')) {
      return 'Dodaj ogłoszenie';
    }
    if (_currentUrl.contains('#manage/')) {
      return 'Zarządzanie';
    }
    if (_currentUrl.contains('#listing/')) {
      return 'Szczegóły';
    }

    return 'TwojBazar';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final systemOverlayStyle = SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: isDark ? Brightness.light : Brightness.dark,
      statusBarBrightness: isDark ? Brightness.dark : Brightness.light,
      systemNavigationBarColor: isDark ? _brandNavy : _appCanvas,
      systemNavigationBarIconBrightness:
          isDark ? Brightness.light : Brightness.dark,
    );

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: systemOverlayStyle,
      child: PopScope(
        canPop: !_canGoBack,
        onPopInvokedWithResult: (didPop, _) {
          if (didPop) {
            return;
          }

          _handleBackPressed();
        },
        child: Scaffold(
        appBar: AppBar(
          title: Text(_appBarTitle),
          actions: [
            IconButton(
              tooltip: 'Strona główna',
              onPressed: () => _openQuickDestination(_QuickDestination.home),
              icon: const Icon(Icons.home_rounded),
            ),
            IconButton(
              tooltip: 'Dodaj ogłoszenie',
              onPressed: () => _openQuickDestination(_QuickDestination.add),
              icon: const Icon(Icons.add_box_rounded),
            ),
            PopupMenuButton<_QuickDestination>(
              tooltip: 'Skróty',
              onSelected: _openQuickDestination,
              itemBuilder: (context) => const [
                PopupMenuItem(
                  value: _QuickDestination.addAi,
                  child: Text('Dodaj szybciej z AI'),
                ),
              ],
              icon: const Icon(Icons.auto_awesome_rounded),
            ),
            IconButton(
              tooltip: 'Odśwież',
              onPressed: _reload,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: SafeArea(
          top: false,
          child: Stack(
            children: [
              Positioned.fill(
                child: _hasError
                    ? _ErrorState(
                        message: _errorMessage.isEmpty
                            ? 'Nie udało się załadować aplikacji.'
                            : _errorMessage,
                        onRetry: _reload,
                      )
                    : WebViewWidget(controller: _controller),
              ),
              if (_isLoading)
                const Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: LinearProgressIndicator(minHeight: 3),
                ),
              Positioned(
                right: 16,
                bottom: 16,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: const Color(0xF0132033),
                    borderRadius: BorderRadius.circular(999),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x33000000),
                        blurRadius: 24,
                        offset: Offset(0, 10),
                      ),
                      BoxShadow(
                        color: Color(0x22FF7A1A),
                        blurRadius: 18,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: 'Wstecz',
                        onPressed: _canGoBack
                            ? () async {
                                await _controller.goBack();
                                await _syncNavigationState();
                              }
                            : null,
                        icon: const Icon(Icons.arrow_back_rounded),
                      ),
                      IconButton(
                        tooltip: 'Dalej',
                        onPressed: _canGoForward
                            ? () async {
                                await _controller.goForward();
                                await _syncNavigationState();
                              }
                            : null,
                        icon: const Icon(Icons.arrow_forward_rounded),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Card(
            elevation: 0,
            color: const Color(0xFFFFF7ED),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: const BorderSide(color: Color(0x1A0F766E)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.cloud_off_rounded,
                    size: 44,
                    color: _brandOrange,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Problem z połączeniem',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    message,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFF42515A),
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: onRetry,
                    child: const Text('Spróbuj ponownie'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
