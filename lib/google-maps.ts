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
}

/**
 * Gets user's current GPS position and reverse-geocodes it into structured address fields.
 * Uses Google Maps Geocoding API if key is present, with zero-config Nominatim fallback.
 */
export async function getCurrentLocationAddress(): Promise<GeocodedAddress> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords

        try {
          const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

          if (googleKey) {
            // Google Maps Geocoding API
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`
            )
            const data = await res.json()

            if (data.status === 'OK' && data.results?.[0]) {
              const components = data.results[0].address_components
              const getComp = (type: string) =>
                components.find((c: any) => c.types.includes(type))?.long_name || ''

              const pincode = getComp('postal_code')
              const city = getComp('locality') || getComp('administrative_area_level_2') || getComp('sublocality_level_1')
              const state = getComp('administrative_area_level_1')
              const district = getComp('administrative_area_level_2')
              const locality = getComp('sublocality_level_1') || getComp('sublocality')
              const route = getComp('route')
              const streetNumber = getComp('street_number')

              const addressLine = [streetNumber, route, locality].filter(Boolean).join(', ') || data.results[0].formatted_address

              resolve({
                address: addressLine,
                address2: locality !== addressLine ? locality : '',
                locality,
                city: city || 'City',
                district: district || city,
                state: state || '',
                country: 'India',
                pincode: pincode || '',
              })
              return
            }
          }

          // Fallback: OpenStreetMap Nominatim API (Free, zero-config)
          const nominatimRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
          )
          const data = await nominatimRes.json()

          if (data && data.address) {
            const addr = data.address
            const pincode = addr.postcode || ''
            const city = addr.city || addr.town || addr.village || addr.suburb || ''
            const district = addr.county || addr.state_district || city
            const state = addr.state || ''
            const road = addr.road || addr.suburb || addr.neighbourhood || ''
            const house = addr.house_number || addr.building || ''

            const fullLine1 = [house, road, addr.suburb].filter(Boolean).join(', ') || data.display_name.split(',')[0]

            resolve({
              address: fullLine1,
              address2: addr.neighbourhood || addr.suburb || '',
              locality: addr.suburb || addr.neighbourhood || '',
              city: city || 'City',
              district: district || city,
              state: state || '',
              country: 'India',
              pincode,
            })
            return
          }

          reject(new Error('Unable to resolve address from your coordinates.'))
        } catch (err) {
          console.error('[geolocation reverse geocode error]:', err)
          reject(new Error('Failed to retrieve address details.'))
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location access denied. Please grant GPS permission in your browser settings.'))
            break
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable.'))
            break
          case error.TIMEOUT:
            reject(new Error('The request to get user location timed out.'))
            break
          default:
            reject(new Error('An unknown location error occurred.'))
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
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
