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

        // Registra a interface de ponte JavaScript -> Android (window.AndroidPip)
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void setDeliveryActive(final boolean active) {
                    isDeliveryActive = active;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    PictureInPictureParams params = new PictureInPictureParams.Builder()
                                            .setAutoEnterEnabled(active)
                                            .setAspectRatio(new Rational(16, 9))
                                            .build();
                                    setPictureInPictureParams(params);
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                            }
                        });
                    }
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
            }, "AndroidPip");
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (isDeliveryActive && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !isInPictureInPictureMode()) {
            enterPipModeInternal();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        // Quando o Waze/Maps é aberto por Intent, a Activity entra em onPause()
        // Aciona o modo PiP para manter o MagicRoute flutuando sobre o Waze/Maps
        if (isDeliveryActive && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !isInPictureInPictureMode()) {
            enterPipModeInternal();
        }
    }

    private void enterPipModeInternal() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
                builder.setAspectRatio(new Rational(16, 9));
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
