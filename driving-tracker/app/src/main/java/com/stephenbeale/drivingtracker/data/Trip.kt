package com.stephenbeale.drivingtracker.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "trips")
data class Trip(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val startTime: Long,
    val endTime: Long? = null,
    val distanceMeters: Double = 0.0,
    val maxSpeedMps: Double = 0.0,
    val isActive: Boolean = true
) {
    val durationMillis: Long
        get() = (endTime ?: System.currentTimeMillis()) - startTime

    val averageSpeedMps: Double
        get() {
            val seconds = durationMillis / 1000.0
            return if (seconds > 0) distanceMeters / seconds else 0.0
        }
}
