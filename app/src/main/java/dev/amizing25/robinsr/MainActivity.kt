package dev.amizing25.robinsr

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import dev.amizing25.robinsr.RustService.Companion.ACTION_STOP_SERVICE
import dev.amizing25.robinsr.databinding.ActivityMainBinding
import dev.amizing25.robinsr.logging.LogAdapter
import dev.amizing25.robinsr.logging.LogRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import kotlin.system.exitProcess

class MainActivity : AppCompatActivity() {
    companion object {
        private const val NOTIFICATION_PERMISSION_REQUEST_CODE = 1337
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: LogAdapter

    // Initialize SharedPreferences
    private val prefs by lazy {
        getSharedPreferences("RobinSRPrefs", MODE_PRIVATE)
    }
    private var isActive = false
    private val stopServiceReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_STOP_SERVICE) {
                isActive = false
                findViewById<TextView>(R.id.serverStatus).text = getString(R.string.off)
                findViewById<Button>(R.id.btnToggleServer).text = getString(R.string.start_server)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        adapter = LogAdapter()

        // Init main view
        setContentView(R.layout.activity_main)

        // Init recycler view
        val recyclerView = findViewById<RecyclerView>(R.id.recyclerView)
        recyclerView.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = this@MainActivity.adapter

        }

        // Init button
        val btn = findViewById<Button>(R.id.btnToggleServer)
        btn.setOnClickListener {
            if (isActive) stopService()
            else startService()
        }

        // Init service stop event
        registerStopEventReceiver()

        // Init notification
        checkNotificationPermission()
        createNotificationChannel()

        // Copy res file into private app dir
        writeDefaultAssetsToMediaDir()
        updateData()

        // Init logs
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                LogRepository.logs.collect { logList ->
                    adapter.submitList(logList)
                    handleAutoScroll()
                }
            }
        }
    }


    /// Service stuff ///

    private fun startService() {
        isActive = true
        findViewById<TextView>(R.id.serverStatus).text = getString(R.string.on)
        findViewById<Button>(R.id.btnToggleServer).text = getString(R.string.stop_server)
        Intent(this, RustService::class.java).also { intent ->
            ContextCompat.startForegroundService(this, intent)
        }
    }

    private fun stopService() {
        val stopIntent = Intent(ACTION_STOP_SERVICE).apply {
            setPackage(packageName)
        }
        sendBroadcast(stopIntent)
    }

    /// Log event ///

    @SuppressLint("UnspecifiedRegisterReceiverFlag")
    private fun registerStopEventReceiver() {
        val filter = IntentFilter(ACTION_STOP_SERVICE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stopServiceReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(stopServiceReceiver, filter)
        }
    }

    private fun handleAutoScroll() {
        val recyclerView = findViewById<RecyclerView>(R.id.recyclerView)
        val layoutManager = recyclerView.layoutManager as LinearLayoutManager

        recyclerView.post {
            val firstVisiblePos = layoutManager.findFirstVisibleItemPosition()
            val visibleThreshold = 3

            if (firstVisiblePos <= visibleThreshold) {
                recyclerView.smoothScrollToPosition(0)
            }
        }
    }

    /// Notification channel ///

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            RustService.CHANNEL_ID,
            "Service Channel",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Background service notifications"
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            setSound(null, null)
            enableLights(false)
            enableVibration(false)
        }

        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(channel)
    }

    /// Permission stuff ///

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_DENIED) {
                showSettingsRedirectDialog()
            }
        }
    }

    private fun checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
                PackageManager.PERMISSION_GRANTED) {

                if (prefs.getBoolean("first_request_done", false)) {
                    if (shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                        showCustomRationaleDialog()
                    } else {
                        showSettingsRedirectDialog()
                    }
                } else {
                    requestPermissions(
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        NOTIFICATION_PERMISSION_REQUEST_CODE
                    )
                    prefs.edit().putBoolean("first_request_done", true).apply()
                }
            }
        }
    }

    private fun showCustomRationaleDialog() {
        AlertDialog.Builder(this)
            .setTitle("Notifications Disabled")
            .setMessage("Notifications are disabled. If the app didn't work correctly, you need to enable notifications (for foreground service)")
            .setPositiveButton("Allow") { _, _ ->
                requestPermissions(
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    NOTIFICATION_PERMISSION_REQUEST_CODE
                )
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showSettingsRedirectDialog() {
        AlertDialog.Builder(this)
            .setTitle("Permission Required")
            .setMessage("Notifications are disabled. If the app didn't work correctly, you need to enable notifications (for foreground service)")
            .setPositiveButton("Open Settings") { _, _ ->
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                }
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    /// RobinSR's data ///

    private fun updateData() {
        copyJsonToPrivateDir(applicationContext, "res.json")
        copyJsonToPrivateDir(applicationContext, "freesr-data.json")
        copyJsonToPrivateDir(applicationContext, "persistent")
        copyJsonToPrivateDir(applicationContext, "versions.json")
    }

    // Android/media.dev.amizing25.robinsr
    private fun getMediaDir(context: Context): File {
        val mediaDir = File(
            context.getExternalFilesDir(null)?.parentFile?.parentFile?.parentFile,
            "media/${context.packageName}"
        )

        if (!mediaDir.exists()) {
            mediaDir.mkdirs()
        }

        return mediaDir
    }

    // copy media data into private app data
    private fun copyJsonToPrivateDir(context: Context, jsonFileName: String) {
        try {
            val mediaDir = getMediaDir(context)

            val sourceFile = File(mediaDir, jsonFileName)
            if (!sourceFile.exists()) {
                throw IOException("JSON file not found in media directory: $mediaDir")
            }

            val privateDir = context.filesDir
            val destinationFile = File(privateDir, jsonFileName)

            FileInputStream(sourceFile).use { input ->
                FileOutputStream(destinationFile).use { output ->
                    input.copyTo(output)
                    LogRepository.addLog("copied $sourceFile into $destinationFile")
                }
            }
        } catch (e: IOException) {
            e.printStackTrace()
            LogRepository.addLog("Error copying file: ${e.message}")
        }
    }

    // write required robinsr files into Android/media/dev.amizing25.robinsr directory
    private fun writeDefaultAssetsToMediaDir() {
        val mediaDir = getMediaDir(applicationContext)
        writeJsonIfNotExist(applicationContext, File(mediaDir, "freesr-data.json"), R.raw.freesr_data)
        writeJsonIfNotExist(applicationContext, File(mediaDir, "persistent"), R.raw.persistent)
        writeJsonIfNotExist(applicationContext, File(mediaDir, "versions.json"), R.raw.versions)
        writeJsonIfNotExist(applicationContext, File(mediaDir, "res.json"), R.raw.res)
    }

    fun writeJsonIfNotExist(context: Context, dst: File, src: Int) {
        try {
            if (!dst.exists()) {
                context.resources.openRawResource(src).use { input ->
                    dst.outputStream().use { output ->
                        input.copyTo(output)
                        LogRepository.addLog("wrote $dst into media directory")
                    }
                }
            }
        } catch(e: Exception) {
            LogRepository.addLog(e.toString())
        }
    }
}