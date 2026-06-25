import os
import shutil
import kagglehub

def main():
    print("Downloading dataset 'kartik2112/fraud-detection' via kagglehub...")
    # Download latest version of the dataset
    downloaded_path = kagglehub.dataset_download("kartik2112/fraud-detection")
    print(f"Dataset downloaded to temporary path: {downloaded_path}")
    
    # Target directory
    target_dir = os.path.join(os.getcwd(), "data")
    os.makedirs(target_dir, exist_ok=True)
    
    # List files in the downloaded path
    files = os.listdir(downloaded_path)
    print(f"Downloaded files: {files}")
    
    # Copy CSV files to the local data/ directory
    for file in files:
        if file.endswith(".csv"):
            src_file = os.path.join(downloaded_path, file)
            dest_file = os.path.join(target_dir, file)
            print(f"Copying {file} to {dest_file}...")
            shutil.copy(src_file, dest_file)
            
    print("Dataset copy complete! Data is ready in the 'data/' directory.")

if __name__ == "__main__":
    main()
