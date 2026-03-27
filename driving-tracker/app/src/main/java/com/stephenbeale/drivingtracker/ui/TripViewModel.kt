package com.stephenbeale.drivingtracker.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.stephenbeale.drivingtracker.data.AppDatabase
import com.stephenbeale.drivingtracker.data.Trip
import com.stephenbeale.drivingtracker.data.TripRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch

class TripViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = TripRepository(AppDatabase.getDatabase(application))

    val allTrips: Flow<List<Trip>> = repository.getAllTrips()

    fun getTripById(tripId: Long): Flow<Trip?> = repository.getTripByIdFlow(tripId)

    fun deleteTrip(tripId: Long) {
        viewModelScope.launch {
            repository.deleteTrip(tripId)
        }
    }
}
