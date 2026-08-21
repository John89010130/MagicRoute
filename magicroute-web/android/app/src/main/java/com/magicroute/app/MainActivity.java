package com.magicroute.app;

import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean isDeliveryActive = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupPipBridge();
    }

    @Override
    public void onStart() {
        super.onStart();
        setupPipBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupPipBridge();
    }

    private void setupPipBridge() {
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            bridge.getWebView().addJavascriptInterface(new AndroidPipInterface(), "AndroidPip");
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public class AndroidPipInterface {
        @JavascriptInterface
        public void setDeliveryActive(final boolean active) {
            isDeliveryActive = active;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                                    .setAspectRatio(new Rational(16, 9));
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) { // Android 12+
                                builder.setAutoEnterEnabled(active);
                            }
                            setPictureInPictureParams(builder.build());
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        @JavascriptInterface
        public void enterPiP() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    enterPipModeInternal();
                }
            });
        }

        @JavascriptInterface
        public boolean isPipSupported() {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O;
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (isDeliveryActive && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && Build.VERSION.SDK_INT < Build.VERSION_CODES.S && !isInPictureInPictureMode()) {
            enterPipModeInternal();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Em versões anteriores ao Android 12 (SDK 31), aciona PiP manualmente no onPause
        if (isDeliveryActive && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && Build.VERSION.SDK_INT < Build.VERSION_CODES.S && !isInPictureInPictureMode()) {
            enterPipModeInternal();
        }
    }

    private void enterPipModeInternal() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                builder.setAspectRatio(new Rational(16, 9));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    builder.setAutoEnterEnabled(true);
                }
                setPictureInPictureParams(builder.build());
                enterPictureInPictureMode(builder.build());
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (bridge != null && bridge.getWebView() != null) {
            final String script = "window.dispatchEvent(new CustomEvent('pip-change', { detail: { isInPip: " + isInPictureInPictureMode + " } }));";
            bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    bridge.getWebView().evaluateJavascript(script, null);
                }
            });
        }
    }
}
