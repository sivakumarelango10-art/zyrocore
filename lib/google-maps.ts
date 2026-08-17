export interface GeocodedAddress {
  address: string
  address2?: string
  locality?: string
  landmark?: string
  city: string
  district?: string
  state: string
  country: string
  pincode: string
  accuracy?: number
}

/**
 * Gets high-precision GPS coordinates using watchPosition accumulator to ensure
 * true hardware GPS satellite lock (down to 3-10m on mobile/GPS devices).
 */
function getHighAccuracyCoordinates(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser.'))
    }

    let bestPosition: GeolocationPosition | null = null
    let watchId: number | null = null
    let timeoutId: any = null

    const finish = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)

      if (bestPosition) {
        resolve({
          lat: bestPosition.coords.latitude,
          lng: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy,
        })
      } else {
        reject(new Error('Unable to obtain precise GPS coordinates. Please ensure location services are enabled.'))
      }
    }

    // Set a sampling window of 4.5 seconds to acquire the most precise GPS satellite lock
    timeoutId = setTimeout(finish, 4500)

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
            bestPosition = position
          }

          // If we achieved high GPS precision (<= 15 meters), resolve immediately
          if (position.coords.accuracy <= 15) {
            finish()
          }
        },
        (error) => {
          if (!bestPosition) {
            if (timeoutId) clearTimeout(timeoutId)
            if (watchId !== null) navigator.geolocation.clearWatch(watchId)
            switch (error.code) {
              case error.PERMISSION_DENIED:
                reject(new Error('Location access denied. Please grant GPS permission in your browser settings.'))
                break
              case error.POSITION_UNAVAILABLE:
                reject(new Error('GPS location information is currently unavailable.'))
                break
              case error.TIMEOUT:
                reject(new Error('Location request timed out. Please try again.'))
                break
              default:
                reject(new Error('An error occurred while detecting your location.'))
            }
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    } catch {
      // Fallback to single getCurrentPosition if watchPosition fails
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    }
  })
}

/**
 * Gets user's current GPS position and reverse-geocodes it into structured address fields with rooftop precision (zoom=18).
 * Uses Google Maps Geocoding API if key is present, with OpenStreetMap Nominatim (zoom=18 building level) fallback.
 */
export async function getCurrentLocationAddress(): Promise<GeocodedAddress> {
  const { lat, lng, accuracy } = await getHighAccuracyCoordinates()

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (googleKey) {
    try {
      // Use exact rooftop / building level geocoding
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&location_type=ROOFTOP|RANGE_INTERPOLATED|GEOMETRIC_CENTER&key=${googleKey}`
      )
      const data = await res.json()

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Pick the most specific rooftop/premise result
        const result = data.results.find((r: any) => 
          r.types.includes('premise') || 
          r.types.includes('subpremise') || 
          r.types.includes('street_address')
        ) || data.results[0]

        const components = result.address_components
        const getComp = (type: string) =>
          components.find((c: any) => c.types.includes(type))?.long_name || ''

        const pincode = getComp('postal_code')
        const city = getComp('locality') || getComp('sublocality_level_1') || getComp('administrative_area_level_2')
        const state = getComp('administrative_area_level_1')
        const district = getComp('administrative_area_level_2') || getComp('locality')
        const sublocality2 = getComp('sublocality_level_2')
        const sublocality1 = getComp('sublocality_level_1') || getComp('sublocality')
        const neighborhood = getComp('neighborhood')
        const route = getComp('route')
        const streetNumber = getComp('street_number')
        const premise = getComp('premise') || getComp('subpremise')

        const streetParts = [premise, streetNumber, route].filter(Boolean).join(' ')
        const areaParts = [sublocality2, sublocality1 || neighborhood].filter(Boolean).join(', ')

        const line1 = streetParts || areaParts || result.formatted_address.split(',')[0]
        const line2 = streetParts && areaParts ? areaParts : ''

        return {
          address: line1,
          address2: line2,
          locality: sublocality1 || neighborhood || sublocality2 || '',
          landmark: neighborhood || sublocality2 || '',
          city: city || 'City',
          district: district || city,
          state: matchIndianState(state),
          country: 'India',
          pincode: pincode ? pincode.replace(/\D/g, '').slice(0, 6) : '',
          accuracy,
        }
      }
    } catch (err) {
      console.warn('[google geocoding error]:', err)
    }
  }

  // High-precision OpenStreetMap Nominatim with zoom=18 (building/house level)
  try {
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await nominatimRes.json()

    if (data && data.address) {
      const addr = data.address
      const pincode = addr.postcode || ''
      const city = addr.city || addr.town || addr.municipality || addr.village || addr.suburb || ''
      const district = addr.county || addr.state_district || addr.district || city
      const state = addr.state || ''

      const houseNumber = addr.house_number || addr.building || addr.house_name || ''
      const amenity = addr.amenity || addr.shop || addr.office || addr.leisure || ''
      const road = addr.road || addr.street || addr.residential || ''
      const sublocality = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || ''
      const landmark = addr.landmark || addr.amenity || addr.place || ''

      const streetBuilding = [amenity, houseNumber, road].filter(Boolean).join(' ')
      const fullLine1 = streetBuilding || sublocality || (data.display_name ? data.display_name.split(',')[0] : '')

      return {
        address: fullLine1,
        address2: sublocality && sublocality !== fullLine1 ? sublocality : '',
        locality: sublocality,
        landmark: landmark || sublocality,
        city: city.trim() || 'City',
        district: (district || city).trim(),
        state: matchIndianState(state),
        country: 'India',
        pincode: pincode ? pincode.replace(/\D/g, '').slice(0, 6) : '',
        accuracy,
      }
    }
  } catch (err) {
    console.warn('[nominatim geocoding error]:', err)
  }

  throw new Error('Unable to resolve a precise address from your current GPS location.')
}

export interface PincodeDetails {
  city: string
  district: string
  state: string
  pincode: string
}

const INDIAN_STATES_LIST = [
  'Andaman & Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra & Nagar Haveli & Daman & Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal'
]

export function matchIndianState(rawState: string): string {
  if (!rawState) return ''
  const clean = rawState.trim().toLowerCase()
  const exact = INDIAN_STATES_LIST.find(s => s.toLowerCase() === clean)
  if (exact) return exact

  if (clean.includes('tamil')) return 'Tamil Nadu'
  if (clean.includes('karnataka')) return 'Karnataka'
  if (clean.includes('kerala')) return 'Kerala'
  if (clean.includes('delhi')) return 'Delhi'
  if (clean.includes('maharashtra')) return 'Maharashtra'
  if (clean.includes('andhra')) return 'Andhra Pradesh'
  if (clean.includes('telangana')) return 'Telangana'
  if (clean.includes('gujarat')) return 'Gujarat'
  if (clean.includes('rajasthan')) return 'Rajasthan'
  if (clean.includes('bengal')) return 'West Bengal'
  if (clean.includes('punjab')) return 'Punjab'
  if (clean.includes('haryana')) return 'Haryana'
  if (clean.includes('uttar pradesh')) return 'Uttar Pradesh'
  if (clean.includes('madhya')) return 'Madhya Pradesh'
  if (clean.includes('bihar')) return 'Bihar'
  if (clean.includes('odisha') || clean.includes('orissa')) return 'Odisha'
  if (clean.includes('puducherry') || clean.includes('pondicherry')) return 'Puducherry'

  return INDIAN_STATES_LIST.find(s => s.toLowerCase().includes(clean) || clean.includes(s.toLowerCase())) || rawState
}

export async function fetchAddressByPincode(pincode: string): Promise<PincodeDetails | null> {
  const cleanPin = pincode.trim()
  if (!/^\d{6}$/.test(cleanPin)) return null

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`)
    const data = await res.json()

    if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
      const poList = data[0].PostOffice
      const primaryPO = poList.find((po: any) => po.DeliveryStatus === 'Delivery') || poList[0]

      const district = primaryPO.District || ''
      const state = primaryPO.State || ''
      const rawBlock = primaryPO.Block && primaryPO.Block !== 'NA' ? primaryPO.Block : ''
      const rawDivision = primaryPO.Division && primaryPO.Division !== 'NA' ? primaryPO.Division.replace(/ (GPO|HO|SO|BO)/i, '') : ''
      const rawName = primaryPO.Name && primaryPO.Name !== 'NA' ? primaryPO.Name.trim() : ''

      const city = rawBlock || rawDivision || rawName || district

      return {
        city: city.trim(),
        district: (district || city).trim(),
        state: matchIndianState(state),
        pincode: cleanPin,
      }
    }
  } catch (err) {
    console.warn('[pincode lookup error]:', err)
  }

  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${cleanPin}&country=India&format=json&addressdetails=1`
    )
    const nomData = await nomRes.json()
    if (Array.isArray(nomData) && nomData.length > 0 && nomData[0].address) {
      const addr = nomData[0].address
      const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || ''
      const district = addr.county || addr.state_district || city
      const state = addr.state || ''

      if (city || state) {
        return {
          city: city.trim() || 'City',
          district: (district || city).trim(),
          state: matchIndianState(state),
          pincode: cleanPin,
        }
      }
    }
  } catch (err) {
    console.warn('[pincode nominatim lookup error]:', err)
  }

  return null
}
