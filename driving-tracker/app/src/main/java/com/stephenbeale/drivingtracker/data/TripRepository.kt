package com.stephenbeale.drivingtracker.data

import kotlinx.coroutines.flow.Flow

class TripRepository(private val database: AppDatabase) {
    private val tripDao = database.tripDao()
    private val locationPointDao = database.locationPointDao()

    fun getAllTrips(): Flow<List<Trip>> = tripDao.getAllTrips()

    fun getTripByIdFlow(tripId: Long): Flow<Trip?> = tripDao.getTripByIdFlow(tripId)

    suspend fun getTripById(tripId: Long): Trip? = tripDao.getTripById(tripId)

    suspend fun getActiveTrip(): Trip? = tripDao.getActiveTrip()

    suspend fun startTrip(): Long {
        val trip = Trip(startTime = System.currentTimeMillis())
        return tripDao.insertTrip(trip)
    }

    suspend fun endTrip(tripId: Long) {
        val trip = tripDao.getTripById(tripId) ?: return
        tripDao.updateTrip(
            trip.copy(
                endTime = System.currentTimeMillis(),
                isActive = false
            )
        )
    }

    suspend fun updateTripDistance(tripId: Long, distanceMeters: Double, maxSpeedMps: Double) {
        val trip = tripDao.getTripById(tripId) ?: return
        tripDao.updateTrip(
            trip.copy(
                distanceMeters = distanceMeters,
                maxSpeedMps = maxOf(trip.maxSpeedMps, maxSpeedMps)
            )
        )
    }

    suspend fun addLocationPoint(point: LocationPoint) {
        locationPointDao.insertPoint(point)
    }

    fun getPointsForTrip(tripId: Long): Flow<List<LocationPoint>> =
        locationPointDao.getPointsForTrip(tripId)

    suspend fun getLastPointForTrip(tripId: Long): LocationPoint? =
        locationPointDao.getLastPointForTrip(tripId)

    suspend fun deleteTrip(tripId: Long) {
        tripDao.deleteTrip(tripId)
    }
}
