import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const TwojBazarApp());
}

class TwojBazarApp extends StatelessWidget {
  const TwojBazarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Twoj Bazar',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F766E),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF4F1EA),
        appBarTheme: const AppBarTheme(
          elevation: 0,
          centerTitle: true,
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF162125),
          surfaceTintColor: Colors.transparent,
          titleTextStyle: TextStyle(
            color: Color(0xFF162125),
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        useMaterial3: true,
      ),
      home: const TwojBazarWebViewPage(),
    );
  }
}

class TwojBazarWebViewPage extends StatefulWidget {
  const TwojBazarWebViewPage({super.key});

  @override
  State<TwojBazarWebViewPage> createState() => _TwojBazarWebViewPageState();
}

class _TwojBazarWebViewPageState extends State<TwojBazarWebViewPage> {
  static const String _initialUrl = 'https://twojbazar.com/app/index.html#home';

  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFF4F1EA))
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

            final scheme = uri.scheme.toLowerCase();
            const embeddedSchemes = {
              'http',
              'https',
              'file',
              'about',
              'data',
              'javascript',
            };

            if (embeddedSchemes.contains(scheme)) {
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

  Future<bool> _handleBackPressed() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
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

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: _handleBackPressed,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Twoj Bazar'),
          actions: [
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
            ],
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
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: const BorderSide(color: Color(0x14000000)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.cloud_off_rounded,
                    size: 44,
                    color: Color(0xFF0F766E),
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
                          color: const Color(0xFF58656B),
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
