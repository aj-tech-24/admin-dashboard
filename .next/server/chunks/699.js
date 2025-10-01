exports.id=699,exports.ids=[699],exports.modules={5710:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,2994,23)),Promise.resolve().then(r.t.bind(r,6114,23)),Promise.resolve().then(r.t.bind(r,9727,23)),Promise.resolve().then(r.t.bind(r,9671,23)),Promise.resolve().then(r.t.bind(r,1868,23)),Promise.resolve().then(r.t.bind(r,4759,23))},3644:(e,t,r)=>{Promise.resolve().then(r.bind(r,2578)),Promise.resolve().then(r.bind(r,1973))},1973:(e,t,r)=>{"use strict";r.d(t,{AuthProvider:()=>i,a:()=>d});var a=r(326),s=r(7577),n=r(5442);let o=(0,s.createContext)(void 0);function i({children:e}){let[t,r]=(0,s.useState)(null),[i,d]=(0,s.useState)(!0),[l,u]=(0,s.useState)(!1),[c,m]=(0,s.useState)(!1),_=async e=>{try{let{data:t,error:r}=await n.O.from("users").select("role").eq("id",e).single();if(r){console.log("Custom users table not found or error:",r.message);let{data:{user:e}}=await n.O.auth.getUser();if(e){let t=e.user_metadata?.role==="admin"||e.user_metadata?.is_admin===!0||e.email?.includes("admin")||e.email?.includes("miniway");u(!!t),console.log("Admin status from metadata:",t)}else u(!1);return}u(t?.role==="admin")}catch(e){console.error("Error checking admin status:",e),u(!0)}},p=async()=>{try{let{data:e,error:t}=await n.O.auth.refreshSession();if(t)throw console.error("Error refreshing session:",t),t;return e}catch(e){throw console.error("Error refreshing session:",e),e}},f=async(e,t)=>{try{d(!0);let{data:r,error:a}=await n.O.auth.signInWithPassword({email:e,password:t});if(a)throw console.error("Sign in error:",a),a;r.user&&await _(r.user.id)}finally{d(!1)}},g=async()=>{try{d(!0);let{error:e}=await n.O.auth.signOut({scope:"global"});e&&console.error("Sign out error:",e),r(null),u(!1),m(!1)}finally{d(!1)}};return a.jsx(o.Provider,{value:{user:t,loading:i||!c,signIn:f,signOut:g,isAdmin:l,refreshSession:p},children:e})}function d(){let e=(0,s.useContext)(o);if(void 0===e)throw Error("useAuth must be used within an AuthProvider");return e}},2972:(e,t,r)=>{"use strict";r.d(t,{AW:()=>l,Eq:()=>u,Fv:()=>d,O2:()=>y,TN:()=>s,_c:()=>c,cQ:()=>i,dc:()=>h,fq:()=>_,gf:()=>n,jT:()=>o,oh:()=>g,ot:()=>m,pz:()=>f,qW:()=>p,tM:()=>v,vO:()=>b});var a=r(5442);let s=async()=>{let[{count:e},{count:t},{count:r},{count:s},{count:n},{count:o},{count:i}]=await Promise.all([a.O.from("buses").select("*",{count:"exact",head:!0}).eq("status","active"),a.O.from("trips").select("*",{count:"exact",head:!0}).eq("status","ongoing"),a.O.from("routes").select("*",{count:"exact",head:!0}),a.O.from("users").select("*",{count:"exact",head:!0}),a.O.from("trips").select("*",{count:"exact",head:!0}).gte("started_at",new Date().toISOString().split("T")[0]),a.O.from("trips").select("*",{count:"exact",head:!0}).eq("status","completed"),a.O.from("trips").select("*",{count:"exact",head:!0}).eq("status","cancelled")]),{data:d}=await a.O.from("trip_passengers").select("*",{count:"exact",head:!0}).eq("status","boarded");return{activeBuses:e||0,ongoingTrips:t||0,totalRoutes:r||0,totalPassengers:d?.length||0,todayTrips:n||0,totalUsers:s||0,completedTrips:o||0,cancelledTrips:i||0}},n=async()=>{let{data:e,error:t}=await a.O.from("buses").select(`
      id,
      plate_number,
      capacity,
      passengers,
      status,
      route_id,
      driver_id,
      conductor_id,
      routes (
        id,
        name,
        start_address,
        end_address
      ),
      driver:users!fk_driver (
        id,
        fullName,
        contact_number,
        license_number,
        license_expiry
      ),
      conductor:users!buses_conductor_id_fkey (
        id,
        fullName,
        contact_number
      )
    `).order("plate_number");return{data:e,error:t}},o=async()=>{let{data:e,error:t}=await a.O.from("users").select("*").eq("role","driver").order("fullName");return{data:e,error:t}},i=async()=>{let{data:e,error:t}=await a.O.from("trips").select(`
      id,
      status,
      current_location,
      started_at,
      buses (
        id,
        plate_number,
        capacity,
        routes (
          id,
          name,
          start_address,
          end_address
        )
      ),
      driver:users!trips_driver_id_fkey (
        id,
        fullName,
        contact_number
      ),
      trip_passengers (
        id,
        status,
        boarded_at,
        commuter:users (
          id,
          fullName
        )
      )
    `).in("status",["waiting","ongoing"]).order("started_at",{ascending:!1});return{data:e,error:t}},d=async(e=50)=>{let{data:t,error:r}=await a.O.from("trips").select(`
      id,
      status,
      started_at,
      ended_at,
      cancelled_at,
      cancellation_reason,
      buses (
        id,
        plate_number,
        routes (
          id,
          name
        )
      ),
      driver:users!trips_driver_id_fkey (
        id,
        fullName
      ),
      trip_passengers (
        id,
        status
      )
    `).in("status",["completed","cancelled"]).order("started_at",{ascending:!1}).limit(e);return{data:t,error:r}},l=async()=>{try{let{data:e,error:t}=await a.O.from("users").select("*").order("updated_at",{ascending:!1});if(t)return console.log("Users table query failed:",t.message),{data:[],error:null};return{data:e,error:t}}catch(e){return console.error("Error in getAllUsers:",e),{data:[],error:null}}},u=async e=>{try{let{data:t,error:r}=await a.O.from("users").select("*").eq("role",e).order("fullName");if(r)return console.log("Users table query failed for role:",e,r.message),{data:[],error:null};return{data:t,error:r}}catch(e){return console.error("Error in getUsersByRole:",e),{data:[],error:null}}},c=async()=>{let{data:e,error:t}=await a.O.from("routes").select("*").order("created_at",{ascending:!1});return{data:e,error:t}},m=async e=>{let{data:t,error:r}=await a.O.from("routes").insert({...e,created_at:new Date().toISOString(),updated_at:new Date().toISOString()}).select();return{data:t,error:r}},_=async(e,t)=>{let{data:r,error:s}=await a.O.from("routes").update({...t,updated_at:new Date().toISOString()}).eq("id",e).select();return{data:r,error:s}},p=async e=>{let{data:t,error:r}=await a.O.from("routes").delete().eq("id",e);return{data:t,error:r}},f=async(e=30)=>{let{data:t,error:r}=await a.O.from("trips").select(`
      id,
      status,
      started_at,
      ended_at,
      buses (
        routes (
          name
        )
      )
    `).gte("started_at",new Date(Date.now()-864e5*e).toISOString()).order("started_at",{ascending:!1});return{data:t,error:r}},g=async()=>{let{data:e,error:t}=await a.O.from("routes").select(`
      id,
      name,
      start_address,
      end_address,
      buses (
        id,
        plate_number,
        status,
        trips (
          id,
          status,
          started_at
        )
      )
    `);return{data:e,error:t}},b=async(e=100)=>{let{data:t,error:r}=await a.O.from("travel_history_commuter").select(`
      id,
      start_location_name,
      end_location_name,
      travel_date,
      route_name,
      status,
      user:users (
        id,
        fullName
      )
    `).order("travel_date",{ascending:!1}).limit(e);if(t&&!r)return{data:t,error:null};if(r&&"PGRST200"===r.code){let{data:t,error:r}=await a.O.from("trips").select(`
        id,
        status,
        started_at,
        ended_at,
        buses (
          routes (
            name,
            start_address,
            end_address
          )
        ),
        driver:users!trips_driver_id_fkey (
          id,
          fullName
        )
      `).in("status",["completed","cancelled"]).order("started_at",{ascending:!1}).limit(e);return r?{data:null,error:r}:{data:t?.map(e=>({id:e.id,start_location_name:e.buses?.routes?.start_address||"Unknown",end_location_name:e.buses?.routes?.end_address||"Unknown",travel_date:e.started_at?.split("T")[0]||new Date().toISOString().split("T")[0],route_name:e.buses?.routes?.name||"Unknown Route",status:e.status,created_at:e.started_at,user:e.driver}))||[],error:null}}return{data:t,error:r}},h=async(e,t)=>{let{data:r,error:s}=await a.O.from("buses").update({status:t,updated_at:new Date().toISOString()}).eq("id",e).select();return{data:r,error:s}},y=async(e,t)=>{let{data:r,error:s}=await a.O.from("buses").update({driver_id:t,updated_at:new Date().toISOString()}).eq("id",e).select();return{data:r,error:s}},v=async(e,t,r)=>{let s={status:t,updated_at:new Date().toISOString()};r&&(s.current_location=r),"completed"===t?s.ended_at=new Date().toISOString():"cancelled"===t&&(s.cancelled_at=new Date().toISOString());let{data:n,error:o}=await a.O.from("trips").update(s).eq("id",e).select();return{data:n,error:o}}},5442:(e,t,r)=>{"use strict";r.d(t,{O:()=>a});let a=(0,r(7608).eI)("https://nbbtnqdvizaxajvaijbv.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYnRucWR2aXpheGFqdmFpamJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0Njk3MjYsImV4cCI6MjA2ODA0NTcyNn0.nTNvDYvZgSErdEEX4GZ36BmGIsbHnMEqQZ40gKub6IU",{auth:{storage:{getItem:e=>null,setItem:(e,t)=>{},removeItem:e=>{}},autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!1,flowType:"pkce"}})},2578:(e,t,r)=>{"use strict";r.d(t,{ConfigProvider:()=>a.ZP});var a=r(5562)},9116:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>g,metadata:()=>f});var a=r(9510),s=r(7366),n=r.n(s),o=r(8570);let i=(0,o.createProxy)(String.raw`D:\React Native\admin-dashboard\node_modules\antd\es\index.js@__barrel_optimize__?names=ConfigProvider`),{__esModule:d,$$typeof:l}=i;i.default;let u=(0,o.createProxy)(String.raw`D:\React Native\admin-dashboard\node_modules\antd\es\index.js@__barrel_optimize__?names=ConfigProvider#ConfigProvider`);r(7272);let c=(0,o.createProxy)(String.raw`D:\React Native\admin-dashboard\app\providers\AuthProvider.tsx`),{__esModule:m,$$typeof:_}=c;c.default;let p=(0,o.createProxy)(String.raw`D:\React Native\admin-dashboard\app\providers\AuthProvider.tsx#AuthProvider`);(0,o.createProxy)(String.raw`D:\React Native\admin-dashboard\app\providers\AuthProvider.tsx#useAuth`);let f={title:"Miniway Admin Dashboard",description:"Comprehensive admin dashboard for Miniway transportation system"};function g({children:e}){return a.jsx("html",{lang:"en",children:a.jsx("body",{className:n().className,children:a.jsx(u,{theme:{token:{colorPrimary:"#6366f1",colorSuccess:"#10b981",colorWarning:"#f59e0b",colorError:"#ef4444",colorInfo:"#3b82f6",borderRadius:8,fontSize:14,fontFamily:"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",boxShadow:"0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",boxShadowSecondary:"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"},components:{Layout:{headerBg:"#ffffff",siderBg:"#f8fafc"},Card:{borderRadius:12,boxShadow:"0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"},Button:{borderRadius:8,controlHeight:40},Input:{borderRadius:8,controlHeight:40}}},children:a.jsx(p,{children:e})})})})}},7272:()=>{}};