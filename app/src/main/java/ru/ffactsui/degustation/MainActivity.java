package ru.ffactsui.degustation;

import android.app.Activity;
import android.app.UiModeManager;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.AtomicFile;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Offline Android shell. Only packaged assets can access the native bridge. */
public class MainActivity extends Activity {
    private static final int IMPORT=11, EXPORT=12, PHOTO=13, CAMERA=14;
    private static final String ORIGIN="degustation.local";
    private static final int STATE_LIMIT=48*1024*1024;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private WebView web;
    private AtomicFile state;
    private String pendingKind="csv", exportName="", exportMime="text/csv";
    private File exportTemp;
    private boolean tv;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        state=new AtomicFile(new File(getFilesDir(),"diary-v1.json"));
        UiModeManager ui=(UiModeManager)getSystemService(UI_MODE_SERVICE);
        tv=(ui!=null&&ui.getCurrentModeType()==Configuration.UI_MODE_TYPE_TELEVISION)
          ||getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK);
        if(saved!=null){pendingKind=saved.getString("pendingKind","csv");exportName=saved.getString("exportName","");exportMime=saved.getString("exportMime","text/csv");}
        exportTemp=new File(getCacheDir(),"pending-export");
        FrameLayout frame=new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(250,248,244));
        try{web=new WebView(this);}catch(Exception e){TextView text=new TextView(this);text.setText("Для работы приложения включите или обновите Android System WebView в настройках устройства.");text.setTextSize(22);text.setPadding(40,60,40,40);frame.addView(text);setContentView(frame);return;}
        web.setBackgroundColor(Color.rgb(250,248,244));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(),"Android");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !isLocal(request.getUrl());}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl();
                if(!isLocal(uri))return denied();
                String path=uri.getPath();
                if(path==null||path.equals("/"))path="/index.html";
                if(path.contains("..")||path.indexOf('\\')>=0)return denied();
                String file=path.substring(1);
                String mime=file.endsWith(".html")?"text/html":file.endsWith(".css")?"text/css":file.endsWith(".js")?"application/javascript":file.endsWith(".png")?"image/png":"application/octet-stream";
                try{return new WebResourceResponse(mime,"UTF-8",getAssets().open(file));}catch(Exception e){return denied();}
            }
        });
        frame.addView(web,new FrameLayout.LayoutParams(-1,-1));
        setContentView(frame);
        frame.setOnApplyWindowInsetsListener((v,insets)->{
            if(android.os.Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);}
            else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        getWindow().setStatusBarColor(Color.rgb(250,248,244));
        getWindow().setNavigationBarColor(Color.rgb(255,253,250));
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        web.loadUrl("https://"+ORIGIN+"/index.html");
    }
    private boolean isLocal(Uri uri){return "https".equals(uri.getScheme())&&ORIGIN.equals(uri.getHost())&&uri.getPort()==-1;}
    private WebResourceResponse denied(){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
    private void result(String kind,String data){runOnUiThread(()->{if(web!=null&&!isFinishing())web.evaluateJavascript("window.App&&App.nativeResult("+JSONObject.quote(kind)+","+JSONObject.quote(data)+")",null);});}
    private void error(String text){result("error",text);}
    private byte[] readBounded(InputStream in,int max)throws Exception{try(InputStream stream=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[8192];int n;while((n=stream.read(buf))!=-1){if(out.size()+n>max)throw new Exception("Файл слишком большой");out.write(buf,0,n);}return out.toByteArray();}}
    private boolean launch(Intent intent,int code){try{startActivityForResult(intent,code);return true;}catch(Exception e){error("На устройстве нет приложения для этого действия. Установите файловый менеджер или приложение камеры.");return false;}}

    private class Bridge {
        @JavascriptInterface public synchronized String readState(){
            if(!state.getBaseFile().exists()&&!new File(state.getBaseFile().getPath()+".bak").exists())return "";
            try{return new String(readBounded(state.openRead(),STATE_LIMIT),StandardCharsets.UTF_8);}
            catch(Exception e){return "{\"unreadable\":true}";}
        }
        @JavascriptInterface public synchronized boolean writeState(String text){
            FileOutputStream stream=null;
            try{byte[] bytes=text.getBytes(StandardCharsets.UTF_8);if(bytes.length>STATE_LIMIT)return false;JSONObject obj=new JSONObject(text);if(obj.optInt("version")!=1||!obj.has("ratings")||!obj.has("wines"))return false;stream=state.startWrite();stream.write(bytes);state.finishWrite(stream);return true;}
            catch(Exception e){if(stream!=null)state.failWrite(stream);return false;}
        }
        @JavascriptInterface public String deviceInfo(){return "{\"tv\":"+tv+"}";}
        @JavascriptInterface public void showKeyboard(){runOnUiThread(()->{web.requestFocus();((InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).showSoftInput(web,InputMethodManager.SHOW_IMPLICIT);});}
        @JavascriptInterface public void pickFile(String kind){runOnUiThread(()->{pendingKind="restore".equals(kind)?"restore":"csv";Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");launch(intent,IMPORT);});}
        @JavascriptInterface public void exportFile(String name,String mime,String data){
            if(data.length()>STATE_LIMIT){error("Слишком большой файл для экспорта");return;}
            io.execute(()->{try{exportName=name.replaceAll("[^a-zA-Z0-9._-]","_");exportMime="application/json".equals(mime)?mime:"text/csv";try(FileOutputStream out=new FileOutputStream(exportTemp)){out.write(data.getBytes(StandardCharsets.UTF_8));}runOnUiThread(()->{Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(exportMime);intent.putExtra(Intent.EXTRA_TITLE,exportName);if(!launch(intent,EXPORT)&&android.os.Build.VERSION.SDK_INT>=29)saveDownloads();});}catch(Exception e){error("Не удалось подготовить экспорт: "+e.getMessage());}});
        }
        @JavascriptInterface public void pickPhoto(String source){runOnUiThread(()->{if("camera".equals(source)){Uri uri=Uri.parse("content://"+getPackageName()+".photos/capture.jpg");Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);intent.putExtra(MediaStore.EXTRA_OUTPUT,uri);intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);intent.setClipData(ClipData.newRawUri("Фото образца",uri));launch(intent,CAMERA);}else{Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("image/*");launch(intent,PHOTO);}});}
    }
    private void saveDownloads(){io.execute(()->{Uri uri=null;try{ContentValues v=new ContentValues();v.put(MediaStore.Downloads.DISPLAY_NAME,exportName);v.put(MediaStore.Downloads.MIME_TYPE,exportMime);v.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/Degustation");v.put(MediaStore.Downloads.IS_PENDING,1);uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);if(uri==null)throw new Exception("Не удалось создать файл");try(OutputStream out=getContentResolver().openOutputStream(uri);InputStream in=new FileInputStream(exportTemp)){copy(in,out);}v.clear();v.put(MediaStore.Downloads.IS_PENDING,0);getContentResolver().update(uri,v,null,null);result("saved","Загрузки/Degustation/"+exportName);}catch(Exception e){if(uri!=null)getContentResolver().delete(uri,null,null);error("Не удалось сохранить файл в Загрузки: "+e.getMessage());}});}
    private void copy(InputStream in,OutputStream out)throws Exception{byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);}
    @Override protected void onActivityResult(int request,int code,Intent data){super.onActivityResult(request,code,data);if(code!=RESULT_OK)return;final Uri uri=data==null?null:data.getData();
        if(request==IMPORT&&uri!=null){final String kind=pendingKind;io.execute(()->{try{byte[] bytes=readBounded(getContentResolver().openInputStream(uri),"restore".equals(kind)?STATE_LIMIT:20*1024*1024);String text;try{text=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();}catch(Exception e){if("restore".equals(kind))throw new Exception("JSON должен быть в UTF-8");text=new String(bytes,"windows-1251");}result(kind,text);}catch(Exception e){error("Не удалось прочитать файл: "+e.getMessage());}});}
        if(request==EXPORT&&uri!=null){io.execute(()->{try(OutputStream out=getContentResolver().openOutputStream(uri,"wt");InputStream in=new FileInputStream(exportTemp)){if(out==null)throw new Exception("Нет доступа к файлу");copy(in,out);result("saved",exportName);}catch(Exception e){error("Не удалось сохранить файл: "+e.getMessage());}});}
        if(request==PHOTO&&uri!=null)io.execute(()->processPhoto(uri));
        if(request==CAMERA)io.execute(()->processPhoto(Uri.parse("content://"+getPackageName()+".photos/capture.jpg")));
    }
    private void processPhoto(Uri uri){try{
        byte[] bytes=readBounded(getContentResolver().openInputStream(uri),32*1024*1024);
        BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);if(options.outWidth<=0||options.outHeight<=0)throw new Exception("Неподдерживаемый формат фото");options.inSampleSize=1;while(Math.max(options.outWidth,options.outHeight)/options.inSampleSize>1600)options.inSampleSize*=2;options.inJustDecodeBounds=false;Bitmap image=BitmapFactory.decodeByteArray(bytes,0,bytes.length,options);if(image==null)throw new Exception("Не удалось декодировать изображение");
        int orientation=ExifInterface.ORIENTATION_NORMAL;try{ExifInterface exif=new ExifInterface(new ByteArrayInputStream(bytes));orientation=exif.getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);}catch(Exception ignored){}Matrix matrix=new Matrix();switch(orientation){case 2:matrix.setScale(-1,1);break;case 3:matrix.setRotate(180);break;case 4:matrix.setScale(1,-1);break;case 5:matrix.setRotate(90);matrix.postScale(-1,1);break;case 6:matrix.setRotate(90);break;case 7:matrix.setRotate(270);matrix.postScale(-1,1);break;case 8:matrix.setRotate(270);break;default:break;}
        Bitmap rotated=Bitmap.createBitmap(image,0,0,image.getWidth(),image.getHeight(),matrix,true);if(rotated!=image)image.recycle();int max=Math.max(rotated.getWidth(),rotated.getHeight());Bitmap resized=max>1200?Bitmap.createScaledBitmap(rotated,rotated.getWidth()*1200/max,rotated.getHeight()*1200/max,true):rotated;if(resized!=rotated)rotated.recycle();ByteArrayOutputStream out=new ByteArrayOutputStream();resized.compress(Bitmap.CompressFormat.JPEG,82,out);resized.recycle();result("photo","data:image/jpeg;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP));
    }catch(Exception|OutOfMemoryError e){error("Не удалось добавить фото: "+e.getMessage());}}
    @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);out.putString("pendingKind",pendingKind);out.putString("exportName",exportName);out.putString("exportMime",exportMime);}
    @Override public void onBackPressed(){if(web==null){super.onBackPressed();return;}web.evaluateJavascript("window.App?App.back():false",value->{if(!"true".equals(value))new android.app.AlertDialog.Builder(this).setTitle("Закрыть дневник?").setMessage("Все сохранённые оценки останутся на устройстве.").setNegativeButton("Остаться",null).setPositiveButton("Закрыть",(d,w)->finish()).show();});}
    @Override public boolean dispatchKeyEvent(KeyEvent event){
        if(tv&&web!=null){String key=null;switch(event.getKeyCode()){case KeyEvent.KEYCODE_DPAD_UP:key="UP";break;case KeyEvent.KEYCODE_DPAD_DOWN:key="DOWN";break;case KeyEvent.KEYCODE_DPAD_LEFT:key="LEFT";break;case KeyEvent.KEYCODE_DPAD_RIGHT:key="RIGHT";break;case KeyEvent.KEYCODE_DPAD_CENTER:case KeyEvent.KEYCODE_ENTER:key="CENTER";break;default:break;}if(key!=null&&!((InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).isAcceptingText()){if(event.getAction()==KeyEvent.ACTION_DOWN)web.evaluateJavascript("window.App&&App.remote("+JSONObject.quote(key)+")",null);return true;}}
        return super.dispatchKeyEvent(event);
    }
    @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}io.shutdown();super.onDestroy();}
}
