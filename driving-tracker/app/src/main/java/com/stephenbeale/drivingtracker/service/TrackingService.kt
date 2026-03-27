package com.stephenbeale.drivingtracker.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.location.Location
import android.os.Binder
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.stephenbeale.drivingtracker.MainActivity
import com.stephenbeale.drivingtracker.R
import com.stephenbeale.drivingtracker.data.AppDatabase
import com.stephenbeale.drivingtracker.data.LocationPoint
import com.stephenbeale.drivingtracker.data.TripRepository
import com.stephenbeale.drivingtracker.util.FormatUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class TrackingService : LifecycleService() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var repository: TripRepository
    private lateinit var notificationManager: NotificationManager

    private val binder = LocalBinder()

    private val _isTracking = MutableStateFlow(false)
    val isTracking: StateFlow<Boolean> = _isTracking

    private val _currentTripId = MutableStateFlow<Long?>(null)
    val currentTripId: StateFlow<Long?> = _currentTripId

    private val _currentSpeed = MutableStateFlow(0.0)
    val currentSpeed: StateFlow<Double> = _currentSpeed

    private val _totalDistance = MutableStateFlow(0.0)
    val totalDistance: StateFlow<Double> = _totalDistance

    private val _elapsedTime = MutableStateFlow(0L)
    val elapsedTime: StateFlow<Long> = _elapsedTime

    private var tripStartTime: Long = 0
    private var lastLocation: Location? = null
    private var accumulatedDistance: Double = 0.0
    private var maxSpeed: Double = 0.0

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { location ->
                onNewLocation(location)
            }
        }
    }

    inner class LocalBinder : Binder() {
        fun getService(): TrackingService = this@TrackingService
    }

    override fun onBind(intent: Intent): IBinder {
        super.onBind(intent)
        return binder
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        repository = TripRepository(AppDatabase.getDatabase(this))
        notificationManager = getSystemService(NotificationManager::class.java)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        when (intent?.action) {
            ACTION_START -> startTracking()
            ACTION_STOP -> stopTracking()
        }
        return START_STICKY
    }

    private fun startTracking() {
        if (_isTracking.value) return

        lifecycleScope.launch {
            val tripId = repository.startTrip()
            _currentTripId.value = tripId
            _isTracking.value = true
            tripStartTime = System.currentTimeMillis()
            accumulatedDistance = 0.0
            maxSpeed = 0.0
            lastLocation = null

            startForeground(NOTIFICATION_ID, createNotification())
            requestLocationUpdates()
            startTimeUpdater()
        }
    }

    private fun stopTracking() {
        if (!_isTracking.value) return

        _isTracking.value = false
        fusedLocationClient.removeLocationUpdates(locationCallback)

        lifecycleScope.launch {
            _currentTripId.value?.let { tripId ->
                repository.endTrip(tripId)
            }
            _currentTripId.value = null
            _currentSpeed.value = 0.0
            _totalDistance.value = 0.0
            _elapsedTime.value = 0L
        }

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun requestLocationUpdates() {
        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            LOCATION_UPDATE_INTERVAL
        )
            .setMinUpdateIntervalMillis(FASTEST_LOCATION_INTERVAL)
            .setMinUpdateDistanceMeters(5f)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            _isTracking.value = false
        }
    }

    private fun onNewLocation(location: Location) {
        val tripId = _currentTripId.value ?: return

        val speedMps = if (location.hasSpeed()) location.speed.toDouble() else 0.0
        _currentSpeed.value = speedMps

        lastLocation?.let { last ->
            val distance = last.distanceTo(location).toDouble()
            if (distance > 2 && location.accuracy < 50) {
                accumulatedDistance += distance
                _totalDistance.value = accumulatedDistance
                if (speedMps > maxSpeed) maxSpeed = speedMps
            }
        }
        lastLocation = location

        lifecycleScope.launch {
            repository.addLocationPoint(
                LocationPoint(
                    tripId = tripId,
                    latitude = location.latitude,
                    longitude = location.longitude,
                    speedMps = location.speed,
                    timestamp = System.currentTimeMillis(),
                    accuracy = location.accuracy
                )
            )
            repository.updateTripDistance(tripId, accumulatedDistance, maxSpeed)
            updateNotification()
        }
    }

    private fun startTimeUpdater() {
        lifecycleScope.launch {
            while (_isTracking.value) {
                _elapsedTime.value = System.currentTimeMillis() - tripStartTime
                kotlinx.coroutines.delay(1000)
            }
        }
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Driving Tracker",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows tracking status while recording a drive"
        }
        notificationManager.createNotificationChannel(channel)
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Tracking Drive")
            .setContentText(buildNotificationText())
            .setSmallIcon(R.drawable.ic_driving)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification() {
        val notification = createNotification()
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun buildNotificationText(): String {
        val distance = FormatUtils.formatDistance(_totalDistance.value)
        val duration = FormatUtils.formatDuration(_elapsedTime.value)
        val speed = FormatUtils.formatSpeed(_currentSpeed.value)
        return "$distance • $duration • $speed"
    }

    companion object {
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val CHANNEL_ID = "tracking_channel"
        const val NOTIFICATION_ID = 1
        const val LOCATION_UPDATE_INTERVAL = 3000L
        const val FASTEST_LOCATION_INTERVAL = 1000L
    }
}
