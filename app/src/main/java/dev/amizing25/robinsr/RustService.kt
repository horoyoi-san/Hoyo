package dev.amizing25.robinsr

import android.annotation.SuppressLint
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

class RustService : Service() {
    private lateinit var rustLib: RustLib
    private lateinit var stopServiceReceiver: BroadcastReceiver

    companion object {
        const val CHANNEL_ID = "RobinSR Mobile Service"
        const val ACTION_STOP_SERVICE = "dev.amizing25.robinsr.ACTION_STOP_SERVICE"
    }

    override fun onCreate() {
        super.onCreate()
        rustLib = RustLib()
        rustLib.init(applicationContext.applicationContext.filesDir.absolutePath.toString())
        registerStopServiceReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = createPersistentNotification()
        ServiceCompat.startForeground(
            this,
            100,
            notification,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            } else {
                0
            }
        )

        rustLib.startServer()

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        unregisterReceiver(stopServiceReceiver)
        super.onDestroy()
    }

    override fun stopService(name: Intent?): Boolean {
        stopServerAndService()
        return super.stopService(name)
    }

    /// -- UTILS -- ///
    private fun createPersistentNotification(): Notification {
        val stopServiceIntent  = Intent(ACTION_STOP_SERVICE).apply {
            setPackage(packageName)
        }
        val stopServicePendingIntent = PendingIntent.getBroadcast(
            this, 0, stopServiceIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("RobinSR Service")
            .setContentText("Server is running")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setOnlyAlertOnce(true)
            .addAction(R.drawable.baseline_close_24, "Stop", stopServicePendingIntent)
            .build()
    }

    @SuppressLint("UnspecifiedRegisterReceiverFlag")
    private fun registerStopServiceReceiver() {
        stopServiceReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                Log.d("RustService", "Broadcast received: ${intent?.action}")
                if (intent?.action == ACTION_STOP_SERVICE) {
                    stopServerAndService()
                }
            }
        }

        val filter = IntentFilter(ACTION_STOP_SERVICE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(stopServiceReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(stopServiceReceiver, filter)
        }
    }

    private fun stopServerAndService() {
        rustLib.stopServer()
        ServiceCompat.stopForeground(
            this, ServiceCompat.STOP_FOREGROUND_REMOVE
        )
        stopSelf()
    }
}