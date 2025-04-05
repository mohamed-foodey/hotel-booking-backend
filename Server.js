const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect('mongodb://localhost:27017/HotelManagement', {
    maxPoolSize: 10,       // Tirada ugu badan ee connections
    connectTimeoutMS: 30000 // Wakhtiga sugida
  })
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Booking Model
const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  gender: { type: String, required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  roomType: { type: String, required: true },
  roomNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Routes
// Create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});












// Get recent bookings (last 10)
app.get('/api/bookings/recent', async (req, res) => {
    try {
      const bookings = await Booking.find()
        .sort({ createdAt: -1 }) // Newest first
        .limit(10); // Only get 10 most recent
        
      res.json(bookings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


// Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    
    // Get current check-ins (today's arrivals)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const arrivals = await Booking.countDocuments({
      checkIn: { 
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    // Get current check-outs (today's departures)
    const departures = await Booking.countDocuments({
      checkOut: { 
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({
      totalBookings,
      arrivals,
      departures
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Enhanced delete endpoint
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);
    
    if (!deletedBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ 
      success: true,
      message: 'Booking deleted successfully',
      deletedId: req.params.id
    });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ 
      error: 'Server error during deletion',
      details: err.message 
    });
  }
});



// Get today's arrivals
app.get('/api/bookings/arrivals', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const arrivals = await Booking.find({
      checkIn: { 
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }).sort({ checkIn: 1 });
    
    res.json(arrivals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get today's departures
app.get('/api/bookings/departures', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const departures = await Booking.find({
      checkOut: { 
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }).sort({ checkOut: 1 });
    
    res.json(departures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});







// Add proper error handling
app.get('/api/rooms/status', async (req, res) => {
  try {
    const bookings = await Booking.find({}).select('roomNumber -_id').lean();
    
    // Validate data
    if (!bookings) {
      throw new Error('Could not retrieve bookings');
    }
    
    const bookedRooms = bookings.map(b => {
      if (!b.roomNumber) {
        throw new Error('Invalid booking data');
      }
      return b.roomNumber;
    });
    
    res.json({ 
      success: true,
      bookedRooms 
    });
    
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Server error' 
    });
  }
});





// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});