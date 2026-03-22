package com.platformsports.app;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Edge-to-edge (Android 15/16) + apply system bar insets as padding
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

    View content = findViewById(android.R.id.content);
    ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
      Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars());
      v.setPadding(sys.left, sys.top, sys.right, sys.bottom);
      return insets;
    });

    // força aplicar insets na hora
    ViewCompat.requestApplyInsets(content);
  }
}
