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
